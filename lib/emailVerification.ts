import "server-only";

import { sql } from "@/lib/db";
import { isEmailConfigured, sendEmail } from "@/lib/email";

const CODE_TTL_MS = 15 * 60_000;

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function requestEmailCode(
  rawEmail: string,
  opts: { excludeUserId?: number } = {}
): Promise<{ ok: true } | { ok: false; error: string }> {
  const email = normalizeEmail(rawEmail);

  if (!isValidEmail(email)) {
    return { ok: false, error: "Некорректная почта" };
  }

  if (!isEmailConfigured()) {
    return { ok: false, error: "Подтверждение почты временно недоступно" };
  }

  const existing = opts.excludeUserId
    ? await sql<{ id: number }[]>`
        SELECT id FROM users WHERE email = ${email} AND id != ${opts.excludeUserId}
      `
    : await sql<{ id: number }[]>`SELECT id FROM users WHERE email = ${email}`;

  if (existing.length > 0) {
    return { ok: false, error: "Эта почта уже привязана к другому аккаунту" };
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();

  await sql`
    INSERT INTO email_verification_codes (email, code, expires_at)
    VALUES (${email}, ${code}, ${expiresAt})
  `;

  await sendEmail(
    email,
    "Код подтверждения — Едем30",
    `<p>Код для подтверждения почты: <b>${code}</b></p><p>Код действует 15 минут. Если вы не запрашивали подтверждение — просто проигнорируйте это письмо.</p>`
  );

  return { ok: true };
}

export async function verifyEmailCode(
  rawEmail: string,
  code: string
): Promise<{ ok: true; email: string } | { ok: false; error: string }> {
  const email = normalizeEmail(rawEmail);

  const rows = await sql<{ id: number; expires_at: string; used_at: string | null }[]>`
    SELECT id, expires_at, used_at FROM email_verification_codes
    WHERE email = ${email} AND code = ${code}
    ORDER BY id DESC
    LIMIT 1
  `;

  const row = rows[0];

  if (!row) {
    return { ok: false, error: "Неверный код" };
  }

  if (row.used_at) {
    return { ok: false, error: "Этот код уже использован" };
  }

  if (new Date(row.expires_at).getTime() < Date.now()) {
    return { ok: false, error: "Код устарел, запросите новый" };
  }

  await sql`UPDATE email_verification_codes SET used_at = ${new Date().toISOString()} WHERE id = ${row.id}`;

  return { ok: true, email };
}
