import "server-only";

import { sql } from "@/lib/db";

const FLASHCALL_URL = "https://zvonok.com/manager/cabapi_external/api/v1/phones/flashcall/";
const CODE_TTL_MS = 5 * 60_000;

export function isPhoneCallConfigured(): boolean {
  return Boolean(process.env.ZVONOK_PUBLIC_KEY && process.env.ZVONOK_CAMPAIGN_ID);
}

type FlashCallResponse =
  | { status: "ok"; data: { call_id: number; phone: string; pincode: string } }
  | { status: "error"; data: string };

/**
 * Инициирует Flash Call через Звонок.com: пользователю поступит звонок,
 * последние 4 цифры номера, с которого позвонят, совпадают с pincode,
 * который возвращает этот же запрос. Мы сохраняем pincode у себя (в том же
 * месте, где обычные коды подтверждения) и сверяем с тем, что введёт
 * пользователь — реальный звонок никак не проверяется отдельно.
 */
export async function requestPhoneCall(
  phone: string
): Promise<{ ok: true; code: string } | { ok: false; error: string }> {
  const publicKey = process.env.ZVONOK_PUBLIC_KEY;
  const campaignId = process.env.ZVONOK_CAMPAIGN_ID;

  if (!publicKey || !campaignId) {
    return { ok: false, error: "Подтверждение по звонку временно недоступно" };
  }

  const params = new URLSearchParams({
    public_key: publicKey,
    campaign_id: campaignId,
    phone: `+${phone}`,
  });

  let data: FlashCallResponse | null = null;

  try {
    const res = await fetch(`${FLASHCALL_URL}?${params.toString()}`, {
      signal: AbortSignal.timeout(8000),
    });
    data = await res.json();
  } catch {
    return { ok: false, error: "Не удалось связаться со службой подтверждения" };
  }

  if (!data || data.status !== "ok" || !data.data?.pincode) {
    return { ok: false, error: "Не удалось позвонить на этот номер" };
  }

  return { ok: true, code: data.data.pincode };
}

/**
 * Подтверждение номера телефона ПРИ РЕГИСТРАЦИИ — до создания аккаунта,
 * поэтому код привязан к номеру, а не к user_id (пользователя ещё нет).
 * По той же схеме, что и email_verification_codes.
 */
export async function requestPhoneVerificationCode(
  phone: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const existing = await sql<{ id: number }[]>`SELECT id FROM users WHERE phone = ${phone}`;

  if (existing.length > 0) {
    return { ok: false, error: "Пользователь с этим номером уже зарегистрирован" };
  }

  const call = await requestPhoneCall(phone);

  if (!call.ok) {
    return { ok: false, error: call.error };
  }

  const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();

  await sql`
    INSERT INTO phone_registration_codes (phone, code, expires_at)
    VALUES (${phone}, ${call.code}, ${expiresAt})
  `;

  return { ok: true };
}

export async function verifyPhoneVerificationCode(
  phone: string,
  code: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const rows = await sql<{ id: number; expires_at: string; used_at: string | null }[]>`
    SELECT id, expires_at, used_at FROM phone_registration_codes
    WHERE phone = ${phone} AND code = ${code}
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
    return { ok: false, error: "Код устарел, запросите новый звонок" };
  }

  await sql`UPDATE phone_registration_codes SET used_at = ${new Date().toISOString()} WHERE id = ${row.id}`;

  return { ok: true };
}
