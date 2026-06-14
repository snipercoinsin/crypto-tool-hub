// Buyer-facing order server functions. No auth required.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const createSchema = z.object({
  toolId: z.string().uuid(),
  email: z.string().email().max(200),
  currency: z.enum(["BTC", "XMR"]),
});

export type OrderDTO = {
  id: string;
  toolName: string;
  email: string;
  currency: "BTC" | "XMR";
  priceUsd: number;
  cryptoAmount: number;
  depositAddress: string;
  status: "pending" | "paid" | "expired";
  expiresAt: string;
  createdAt: string;
  downloadToken: string | null;
};

export const createOrder = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => createSchema.parse(d))
  .handler(async ({ data }): Promise<OrderDTO> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getUsdToCryptoRate } = await import("@/lib/crypto-rates.server");

    const { data: tool, error: tErr } = await supabaseAdmin
      .from("tools")
      .select("id,name,price_usd")
      .eq("id", data.toolId)
      .single();
    if (tErr || !tool) throw new Error("Tool not found");

    const { data: setting, error: sErr } = await supabaseAdmin
      .from("settings")
      .select("key,value")
      .in("key", ["btc_address", "xmr_address"]);
    if (sErr) throw new Error(sErr.message);
    const map = Object.fromEntries((setting ?? []).map((r) => [r.key, r.value]));
    const address = data.currency === "BTC" ? map.btc_address : map.xmr_address;
    if (!address) throw new Error(`No ${data.currency} receiving address configured.`);

    const usdPerUnit = await getUsdToCryptoRate(data.currency);
    const cryptoAmount = Number(tool.price_usd) / usdPerUnit;
    const rounded = data.currency === "BTC"
      ? Math.ceil(cryptoAmount * 1e8) / 1e8
      : Math.ceil(cryptoAmount * 1e12) / 1e12;

    const { data: order, error: oErr } = await supabaseAdmin
      .from("orders")
      .insert({
        tool_id: data.toolId,
        email: data.email,
        currency: data.currency,
        price_usd: tool.price_usd,
        crypto_amount: rounded,
        deposit_address: address,
      })
      .select("*")
      .single();
    if (oErr || !order) throw new Error(oErr?.message ?? "Could not create order");

    return {
      id: order.id,
      toolName: tool.name,
      email: order.email,
      currency: order.currency as "BTC" | "XMR",
      priceUsd: Number(order.price_usd),
      cryptoAmount: Number(order.crypto_amount),
      depositAddress: order.deposit_address,
      status: order.status as OrderDTO["status"],
      expiresAt: order.expires_at,
      createdAt: order.created_at,
      downloadToken: null,
    };
  });

export const getOrder = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }): Promise<OrderDTO> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: o, error } = await supabaseAdmin
      .from("orders")
      .select("*, tools(name)")
      .eq("id", data.id)
      .single();
    if (error || !o) throw new Error("Order not found");
    return {
      id: o.id,
      toolName: (o.tools as { name: string } | null)?.name ?? "",
      email: o.email,
      currency: o.currency as "BTC" | "XMR",
      priceUsd: Number(o.price_usd),
      cryptoAmount: Number(o.crypto_amount),
      depositAddress: o.deposit_address,
      status: o.status as OrderDTO["status"],
      expiresAt: o.expires_at,
      createdAt: o.created_at,
      downloadToken: o.status === "paid" ? o.download_token : null,
    };
  });

// Polled by the payment page. Auto-marks expired. For BTC, checks mempool.space.
// For XMR, returns current status only (admin confirms manually).
export const checkPayment = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }): Promise<{ status: OrderDTO["status"]; downloadToken: string | null }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: o, error } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error || !o) throw new Error("Order not found");

    if (o.status === "paid") return { status: "paid", downloadToken: o.download_token };

    const now = Date.now();
    const expiresAt = new Date(o.expires_at).getTime();

    if (o.status === "pending" && o.currency === "BTC") {
      try {
        const { checkBtcPayment } = await import("@/lib/crypto-rates.server");
        const sats = Math.round(Number(o.crypto_amount) * 1e8);
        const since = Math.floor(new Date(o.created_at).getTime() / 1000) - 120;
        const r = await checkBtcPayment(o.deposit_address, sats, since);
        if (r.paid) {
          await supabaseAdmin
            .from("orders")
            .update({ status: "paid", paid_at: new Date().toISOString(), paid_txid: r.txid })
            .eq("id", o.id);
          return { status: "paid", downloadToken: o.download_token };
        }
      } catch (e) {
        console.error("[btc check]", e);
      }
    }

    if (o.status === "pending" && now > expiresAt) {
      await supabaseAdmin.from("orders").update({ status: "expired" }).eq("id", o.id);
      return { status: "expired", downloadToken: null };
    }

    return { status: o.status as OrderDTO["status"], downloadToken: null };
  });

export const getDownloadUrl = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ orderId: z.string().uuid(), token: z.string().min(10) }).parse(d))
  .handler(async ({ data }): Promise<{ url: string; filename: string }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: o, error } = await supabaseAdmin
      .from("orders")
      .select("status,download_token,tool_id,tools(name,zip_path)")
      .eq("id", data.orderId)
      .single();
    if (error || !o) throw new Error("Order not found");
    if (o.status !== "paid") throw new Error("Order not paid");
    if (o.download_token !== data.token) throw new Error("Invalid token");
    const tool = o.tools as { name: string; zip_path: string } | null;
    if (!tool?.zip_path) throw new Error("File missing");
    const { data: signed } = await supabaseAdmin.storage
      .from("tool-zips")
      .createSignedUrl(tool.zip_path, 60 * 10, { download: `${tool.name}.zip` });
    if (!signed?.signedUrl) throw new Error("Could not sign download URL");
    return { url: signed.signedUrl, filename: `${tool.name}.zip` };
  });
