import "server-only";

import crypto from "crypto";

export function isTelegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN);
}

export type TelegramWidgetPayload = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
};

const MAX_AUTH_AGE_SECONDS = 24 * 60 * 60;

/** Проверяет подпись данных от Telegram Login Widget. */
export function verifyTelegramAuth(payload: TelegramWidgetPayload): boolean {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return false;

  const { hash, ...rest } = payload;

  const dataCheckString = Object.keys(rest)
    .sort()
    .map((key) => `${key}=${rest[key as keyof typeof rest]}`)
    .join("\n");

  const secretKey = crypto.createHash("sha256").update(botToken).digest();
  const computedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  if (computedHash.length !== hash.length) return false;

  const valid = crypto.timingSafeEqual(
    Buffer.from(computedHash),
    Buffer.from(hash)
  );

  if (!valid) return false;

  const ageSeconds = Date.now() / 1000 - payload.auth_date;
  return ageSeconds >= 0 && ageSeconds <= MAX_AUTH_AGE_SECONDS;
}

export function telegramProfileFromPayload(payload: TelegramWidgetPayload) {
  return {
    providerId: String(payload.id),
    name: `${payload.first_name} ${payload.last_name ?? ""}`.trim(),
    avatarUrl: payload.photo_url ?? null,
  };
}
