import "server-only";

import { sql } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { normalizePhone } from "@/lib/phone";
import { isEmailConfigured, sendEmail } from "@/lib/email";

const CODE_TTL_MS = 15 * 60_000;

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const visible = local.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(local.length - 2, 1))}@${domain}`;
}

export async function requestPasswordReset(
  rawPhone: string
): Promise<{ ok: true; maskedEmail: string } | { ok: false; error: string }> {
  const phone = normalizePhone(rawPhone);

  if (phone.length !== 11) {
    return { ok: false, error: "Номер телефона должен содержать 11 цифр" };
  }

  if (!isEmailConfigured()) {
    return { ok: false, error: "Восстановление пароля временно недоступно" };
  }

  const users = await sql<{ id: number; email: string | null }[]>`
    SELECT id, email FROM users WHERE phone = ${phone}
  `;

  const user = users[0];

  if (!user || !user.email) {
    return {
      ok: false,
      error:
        "Для этого номера не указана почта. Обратитесь в поддержку @edem30bot, чтобы восстановить доступ.",
    };
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();

  await sql`
    INSERT INTO password_reset_codes (user_id, code, expires_at)
    VALUES (${user.id}, ${code}, ${expiresAt})
  `;

  await sendEmail(
    user.email,
    "Код для восстановления пароля — Едем30",
    `<p>Код для восстановления пароля: <b>${code}</b></p><p>Код действует 15 минут. Если вы не запрашивали восстановление — просто проигнорируйте это письмо.</p>`
  );

  return { ok: true, maskedEmail: maskEmail(user.email) };
}

export async function confirmPasswordReset(
  rawPhone: string,
  code: string,
  newPassword: string
): Promise<{ ok: true; userId: number } | { ok: false; error: string }> {
  const phone = normalizePhone(rawPhone);

  const users = await sql<{ id: number }[]>`SELECT id FROM users WHERE phone = ${phone}`;
  const user = users[0];

  if (!user) {
    return { ok: false, error: "Пользователь не найден" };
  }

  const rows = await sql<{ id: number; expires_at: string; used_at: string | null }[]>`
    SELECT id, expires_at, used_at FROM password_reset_codes
    WHERE user_id = ${user.id} AND code = ${code}
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

  const passwordHash = await hashPassword(newPassword);

  await sql`UPDATE password_reset_codes SET used_at = ${new Date().toISOString()} WHERE id = ${row.id}`;
  await sql`UPDATE users SET password_hash = ${passwordHash} WHERE id = ${user.id}`;

  return { ok: true, userId: user.id };
}
