import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import QRCode from "qrcode";
import { createOrder, checkPayment, type OrderDTO } from "@/lib/api/orders.functions";
import type { ToolCard } from "@/lib/api/storefront.functions";

export function PaymentModal({
  open,
  onClose,
  tool,
}: {
  open: boolean;
  onClose: () => void;
  tool: ToolCard;
}) {
  const [order, setOrder] = useState<OrderDTO | null>(null);
  const [email, setEmail] = useState("");
  const [currency, setCurrency] = useState<"BTC" | "XMR">("BTC");
  const [loading, setLoading] = useState(false);
  const create = useServerFn(createOrder);
  const check = useServerFn(checkPayment);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) {
      setOrder(null);
      setLoading(false);
    }
  }, [open]);

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      const o = await create({ data: { toolId: tool.id, email, currency } });
      setOrder(o);
    } catch (err) {
      toast.error((err as Error).message || "Could not create order");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="card-elev my-8 w-full max-w-md rounded-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 text-sm uppercase tracking-widest text-muted-foreground">
          {order ? "Awaiting payment" : "Checkout"}
        </div>
        <h2 className="mb-4 text-2xl font-semibold">{tool.name}</h2>

        {!order ? (
          <form onSubmit={submit} className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm text-muted-foreground">Email address</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-border bg-[color:var(--input)] px-4 py-3 outline-none focus:ring-2 focus:ring-[color:var(--ring)]"
              />
            </label>

            <div>
              <span className="mb-2 block text-sm text-muted-foreground">
                Choose crypto to pay with:
              </span>
              <div className="grid grid-cols-2 gap-2">
                {(["BTC", "XMR"] as const).map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setCurrency(c)}
                    className={`rounded-xl border px-4 py-3 font-medium transition ${
                      currency === c
                        ? "border-[color:var(--primary)] bg-[color:var(--primary)]/10 text-[color:var(--primary)]"
                        : "border-border bg-secondary hover:bg-accent"
                    }`}
                  >
                    {c === "BTC" ? "Bitcoin (BTC)" : "Monero (XMR)"}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[color:var(--primary)] px-4 py-3 font-semibold text-[color:var(--primary-foreground)] transition hover:brightness-110 disabled:opacity-60"
            >
              {loading ? "Creating order…" : `Pay $${tool.price_usd.toFixed(2)} USD`}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-accent"
            >
              Cancel
            </button>
          </form>
        ) : (
          <PendingInline
            order={order}
            onPaid={(token) =>
              navigate({
                to: "/download/$orderId",
                params: { orderId: order.id },
                search: { t: token },
              })
            }
            onExpired={() => setOrder({ ...order, status: "expired" })}
            checkFn={check}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
}

function PendingInline({
  order,
  onPaid,
  onExpired,
  checkFn,
  onClose,
}: {
  order: OrderDTO;
  onPaid: (token: string) => void;
  onExpired: () => void;
  checkFn: (args: { data: { id: string } }) => Promise<{ status: OrderDTO["status"]; downloadToken: string | null }>;
  onClose: () => void;
}) {
  const [qr, setQr] = useState("");
  const uri = useMemo(() => {
    const scheme = order.currency === "BTC" ? "bitcoin" : "monero";
    return `${scheme}:${order.depositAddress}?amount=${order.cryptoAmount}`;
  }, [order]);

  useEffect(() => {
    QRCode.toDataURL(uri, { margin: 1, width: 300, color: { dark: "#0e0e12", light: "#ffffff" } })
      .then(setQr)
      .catch(() => setQr(""));
  }, [uri]);

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (order.status !== "pending") return;
    let stopped = false;
    const tick = async () => {
      try {
        const r = await checkFn({ data: { id: order.id } });
        if (stopped) return;
        if (r.status === "paid" && r.downloadToken) onPaid(r.downloadToken);
        else if (r.status === "expired") onExpired();
      } catch {
        /* ignore */
      }
    };
    const t = setInterval(tick, 12_000);
    return () => {
      stopped = true;
      clearInterval(t);
    };
  }, [order, checkFn, onPaid, onExpired]);

  if (order.status === "expired") {
    return (
      <div className="py-6 text-center">
        <p className="text-lg font-semibold text-[color:var(--destructive)]">Order expired</p>
        <p className="mt-2 text-sm text-muted-foreground">No payment was received in time.</p>
        <button
          onClick={onClose}
          className="mt-5 w-full rounded-xl bg-[color:var(--primary)] px-4 py-3 font-semibold text-[color:var(--primary-foreground)]"
        >
          Close
        </button>
      </div>
    );
  }

  const expires = new Date(order.expiresAt).getTime();
  const remaining = Math.max(0, Math.floor((expires - now) / 1000));
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Receipt: <span className="font-mono text-foreground">{order.email}</span>
      </p>

      <div className="flex flex-col items-center gap-3">
        {qr && (
          <img
            src={qr}
            alt="Payment QR"
            className="h-60 w-60 rounded-xl bg-white p-2 shadow-[var(--shadow-card)]"
          />
        )}
        <div
          className={`font-mono text-3xl ${
            remaining < 60
              ? "text-[color:var(--destructive)]"
              : "text-[color:var(--primary)]"
          }`}
        >
          {mm}:{ss}
        </div>
        <div className="text-xs text-muted-foreground">Time remaining</div>
      </div>

      <ReadOnly label={`Amount (${order.currency})`} value={order.cryptoAmount.toString()} mono />
      <ReadOnly label="Send to address" value={order.depositAddress} mono />
      <ReadOnly label="Price (USD)" value={`$${order.priceUsd.toFixed(2)}`} />

      {order.currency === "XMR" && (
        <p className="rounded-lg border border-border bg-secondary p-3 text-xs text-muted-foreground">
          Monero payments are confirmed manually once the deposit clears. The download link
          will appear here automatically.
        </p>
      )}

      <button
        onClick={onClose}
        className="w-full rounded-xl border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-accent"
      >
        Close
      </button>
    </div>
  );
}

function ReadOnly({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <input
        readOnly
        value={value}
        onClick={(e) => (e.target as HTMLInputElement).select()}
        className={`w-full select-all rounded-xl border border-border bg-[color:var(--input)] px-3 py-2.5 text-sm ${mono ? "font-mono" : ""}`}
      />
    </label>
  );
}
