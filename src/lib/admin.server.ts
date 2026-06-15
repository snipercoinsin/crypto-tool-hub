// Server-only admin helpers: session, password verification.
import { useSession } from "@tanstack/react-start/server";

// PBKDF2-SHA256 derived hash of the admin password.
// Salt and iterations are public; only the password itself is the secret.
// To rotate: pick a new password, compute pbkdf2(pw, SALT, ITERATIONS, 32, 'sha-256')
// and replace ADMIN_PASSWORD_HASH. Optionally override via ADMIN_PASSWORD_HASH env var.
const SALT = "hikaso-admin-v1";
const ITERATIONS = 200_000;
const ADMIN_PASSWORD_HASH_DEFAULT =
  "88e4298370398feadb7115a2c6d0368fb72f78a19b4f822d006bbf2e01f6d0dd";

function expectedHash(): string {
  return (process.env.ADMIN_PASSWORD_HASH || ADMIN_PASSWORD_HASH_DEFAULT).toLowerCase();
}

function toHex(buf: ArrayBuffer): string {
  const b = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < b.length; i++) s += b[i].toString(16).padStart(2, "0");
  return s;
}

export async function hashPassword(pw: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(pw),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: enc.encode(SALT), iterations: ITERATIONS, hash: "SHA-256" },
    key,
    256,
  );
  return toHex(bits);
}

export async function verifyAdminPassword(pw: string): Promise<boolean> {
  const h = await hashPassword(pw);
  const expected = expectedHash();
  if (h.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < h.length; i++) diff |= h.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

function sessionPassword(): string {
  const k = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!k || k.length < 32) throw new Error("Server misconfigured");
  return k;
}

export type AdminSession = { isAdmin?: boolean; loggedAt?: number };

export async function getAdminSession() {
  return useSession<AdminSession>({
    password: sessionPassword(),
    name: "admin_sess",
    maxAge: 60 * 60 * 8,
    cookie: { httpOnly: true, sameSite: "strict", secure: true, path: "/" },
  });
}

export async function requireAdmin() {
  const sess = await getAdminSession();
  if (!sess.data.isAdmin) throw new Error("Unauthorized");
  return sess;
}
