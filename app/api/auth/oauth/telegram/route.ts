import { NextRequest, NextResponse } from "next/server";

import {
  isTelegramConfigured,
  telegramProfileFromPayload,
  TelegramWidgetPayload,
  verifyTelegramAuth,
} from "@/lib/oauth/telegram";
import { loginWithOAuthProfile } from "@/lib/oauthAccounts";
import { rateLimit } from "@/lib/rateLimit";
import { isTrustedOrigin } from "@/lib/security";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!isTrustedOrigin(req)) {
    return NextResponse.json(
      { error: "Недопустимый источник запроса" },
      { status: 403 }
    );
  }

  if (!isTelegramConfigured()) {
    return NextResponse.json({ error: "Вход через Telegram не настроен" }, { status: 503 });
  }

  const limit = rateLimit(`oauth-telegram:${req.headers.get("x-forwarded-for") ?? "unknown"}`, {
    limit: 20,
    windowMs: 60_000,
  });

  if (!limit.allowed) {
    return NextResponse.json({ error: "Слишком много запросов" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);

  const payload: TelegramWidgetPayload = {
    id: Number(body?.id),
    first_name: typeof body?.first_name === "string" ? body.first_name : "",
    last_name: typeof body?.last_name === "string" ? body.last_name : undefined,
    username: typeof body?.username === "string" ? body.username : undefined,
    photo_url: typeof body?.photo_url === "string" ? body.photo_url : undefined,
    auth_date: Number(body?.auth_date),
    hash: typeof body?.hash === "string" ? body.hash : "",
  };

  if (!payload.id || !payload.hash || !payload.auth_date) {
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  }

  if (!verifyTelegramAuth(payload)) {
    return NextResponse.json({ error: "Не удалось проверить подпись Telegram" }, { status: 401 });
  }

  const profile = telegramProfileFromPayload(payload);

  await loginWithOAuthProfile({
    provider: "telegram",
    providerId: profile.providerId,
    name: profile.name,
    avatarUrl: profile.avatarUrl,
  });

  return NextResponse.json({ ok: true });
}
