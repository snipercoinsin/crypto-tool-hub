// Server-only admin helpers: session, password verification, settings.
import { useSession, getCookie, setCookie } from "@tanstack/react-start/server";
import { createHash } from "node:crypto";

// SHA-256 of "HikasoSniper00336#"
const ADMIN_PASSWORD_HASH =
  "015ece0f4ffdbd5e325f904b41e39c7e5f55d6dc7cd19df4d0b7426b38be9c55";

export function hashPassword(pw: string): string {
  return createHash("sha256").update(pw).digest("hex");
}

export function verifyAdminPassword(pw: string): boolean {
  const h = hashPassword(pw);
  // timing-ish safe compare
  if (h.length !== ADMIN_PASSWORD_HASH.length) return false;
  let diff = 0;
  for (let i = 0; i < h.length; i++) diff |= h.charCodeAt(i) ^ ADMIN_PASSWORD_HASH.charCodeAt(i);
  return diff === 0;
}

function sessionPassword(): string {
  const k = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!k || k.length < 32) throw new Error("Server misconfigured: missing session key source");
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
