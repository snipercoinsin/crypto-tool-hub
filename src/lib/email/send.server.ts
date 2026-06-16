// Server-only SMTP sender + helper to email a buyer their download link
// after payment is confirmed. Uses worker-mailer (Cloudflare-Workers SMTP).
import { WorkerMailer } from "worker-mailer";

export type SmtpConfig = {
  host: string;
  port: number;
  user: string;
  pass: string;
  secure: "ssl" | "tls" | "starttls" | "none";
  fromName: string;
  fromEmail: string;
};

export async function readSmtpConfig(): Promise<SmtpConfig | null> {
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
    ]);
  const m = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
  if (!m.smtp_host || !m.smtp_port || !m.smtp_user || !m.smtp_pass || !m.smtp_from_email) {
    return null;
  }
  return {
    host: m.smtp_host,
    port: Number(m.smtp_port),
    user: m.smtp_user,
    pass: m.smtp_pass,
    secure: ((m.smtp_secure as SmtpConfig["secure"]) || "tls"),
    fromName: m.smtp_from_name || "",
    fromEmail: m.smtp_from_email,
  };
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<void> {
  const cfg = await readSmtpConfig();
  if (!cfg) throw new Error("SMTP is not configured");
  const mailer = await WorkerMailer.connect({
    credentials: { username: cfg.user, password: cfg.pass },
    authType: "plain",
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure === "ssl" || cfg.secure === "tls",
    startTls: cfg.secure === "starttls",
  });
  const from = cfg.fromName
    ? { name: cfg.fromName, email: cfg.fromEmail }
    : cfg.fromEmail;
  await mailer.send({
    from,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text ?? opts.html.replace(/<[^>]+>/g, ""),
  });
  try {
    await mailer.close?.();
  } catch {
    /* ignore */
  }
}

function render(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
}

const DEFAULT_SUBJECT = "Your purchase: {tool_name}";
const DEFAULT_BODY = `<p>Hi,</p>
<p>Thank you for your purchase of <strong>{tool_name}</strong>.</p>
<p>Your secure download link (valid for 24 hours):</p>
<p><a href="{download_url}">{download_url}</a></p>
<p>If you need help, just reply to this email.</p>`;

/**
 * Called from the payment-confirmation flow. If SMTP is configured and
 * auto-send is enabled, emails the buyer their download link. Never throws
 * upward — failures only logged so payment confirmation stays unaffected.
 */
export async function deliverPaidOrderEmail(orderId: string): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: s } = await supabaseAdmin
      .from("settings")
      .select("key,value")
      .in("key", ["email_auto_send", "email_subject", "email_body", "site_name"]);
    const m = Object.fromEntries((s ?? []).map((r) => [r.key, r.value]));
    if ((m.email_auto_send ?? "0") !== "1") return;

    const { data: o, error } = await supabaseAdmin
      .from("orders")
      .select("id,email,download_token,status,tools(name,zip_path)")
      .eq("id", orderId)
      .single();
    if (error || !o || o.status !== "paid") return;
    const tool = o.tools as { name: string; zip_path: string } | null;
    if (!tool) return;

    const { data: signed } = await supabaseAdmin.storage
      .from("tool-zips")
      .createSignedUrl(tool.zip_path, 60 * 60 * 24, { download: `${tool.name}.zip` });
    if (!signed?.signedUrl) return;

    const vars = {
      tool_name: tool.name,
      download_url: signed.signedUrl,
      site_name: m.site_name || "Hikaso",
      email: o.email,
    };
    const subject = render(m.email_subject || DEFAULT_SUBJECT, vars);
    const html = render(m.email_body || DEFAULT_BODY, vars);
    await sendEmail({ to: o.email, subject, html });
  } catch (e) {
    console.error("[deliverPaidOrderEmail]", e);
  }
}
