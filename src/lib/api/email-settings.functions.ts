// Admin email/SMTP settings + test send.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const adminGetEmailSettings = createServerFn({ method: "GET" }).handler(async () => {
  const { requireAdmin } = await import("@/lib/admin.server");
  await requireAdmin();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("settings")
    .select("key,value")
    .in("key", [
      "smtp_host",
      "smtp_port",
      "smtp_user",
      "smtp_pass",
      "smtp_secure",
      "smtp_from_name",
      "smtp_from_email",
      "email_auto_send",
      "email_subject",
      "email_body",
    ]);
  const m = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
  return {
    smtp_host: m.smtp_host ?? "",
    smtp_port: m.smtp_port ?? "587",
    smtp_user: m.smtp_user ?? "",
    smtp_pass: m.smtp_pass ?? "",
    smtp_secure: (m.smtp_secure as "ssl" | "tls" | "starttls" | "none") || "starttls",
    smtp_from_name: m.smtp_from_name ?? "",
    smtp_from_email: m.smtp_from_email ?? "",
    email_auto_send: m.email_auto_send === "1",
    email_subject: m.email_subject ?? "Your purchase: {tool_name}",
    email_body:
      m.email_body ??
      "<p>Hi,</p><p>Thank you for your purchase of <strong>{tool_name}</strong>.</p><p>Your secure download link (valid for 24 hours):</p><p><a href=\"{download_url}\">{download_url}</a></p>",
  };
});

const saveSchema = z.object({
  smtp_host: z.string().max(200),
  smtp_port: z.string().regex(/^\d+$/).max(6),
  smtp_user: z.string().max(200),
  smtp_pass: z.string().max(500),
  smtp_secure: z.enum(["ssl", "tls", "starttls", "none"]),
  smtp_from_name: z.string().max(100),
  smtp_from_email: z.string().email().max(200),
  email_auto_send: z.boolean(),
  email_subject: z.string().min(1).max(300),
  email_body: z.string().min(1).max(20000),
});

export const adminSaveEmailSettings = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => saveSchema.parse(d))
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("@/lib/admin.server");
    await requireAdmin();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const rows = [
      ["smtp_host", data.smtp_host.trim()],
      ["smtp_port", data.smtp_port.trim()],
      ["smtp_user", data.smtp_user.trim()],
      ["smtp_pass", data.smtp_pass],
      ["smtp_secure", data.smtp_secure],
      ["smtp_from_name", data.smtp_from_name.trim()],
      ["smtp_from_email", data.smtp_from_email.trim()],
      ["email_auto_send", data.email_auto_send ? "1" : "0"],
      ["email_subject", data.email_subject],
      ["email_body", data.email_body],
    ].map(([key, value]) => ({ key, value, updated_at: new Date().toISOString() }));
    const { error } = await supabaseAdmin.from("settings").upsert(rows, { onConflict: "key" });
    if (error) {
      console.error("[adminSaveEmailSettings]", error);
      throw new Error("Could not save email settings");
    }
    return { ok: true };
  });

export const adminTestEmail = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ to: z.string().email() }).parse(d))
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("@/lib/admin.server");
    await requireAdmin();
    const { sendEmail } = await import("@/lib/email/send.server");
    try {
      await sendEmail({
        to: data.to,
        subject: "SMTP test from your storefront",
        html: "<p>This is a test email confirming your SMTP settings work correctly.</p>",
      });
      return { ok: true };
    } catch (e) {
      console.error("[adminTestEmail]", e);
      throw new Error((e as Error).message || "Send failed");
    }
  });
