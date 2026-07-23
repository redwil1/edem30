import { NextRequest, NextResponse } from "next/server";

import { getVkUserInfo, isVkConfigured } from "@/lib/oauth/vk";
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

  if (!isVkConfigured()) {
    return NextResponse.json({ error: "Вход через VK не настроен" }, { status: 503 });
  }

  const limit = rateLimit(`oauth-vk:${req.headers.get("x-forwarded-for") ?? "unknown"}`, {
    limit: 20,
    windowMs: 60_000,
  });

  if (!limit.allowed) {
    return NextResponse.json({ error: "Слишком много запросов" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const accessToken = typeof body?.accessToken === "string" ? body.accessToken : "";

  if (!accessToken) {
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  }

  const profile = await getVkUserInfo(accessToken);

  if (!profile) {
    return NextResponse.json({ error: "Не удалось подтвердить вход через VK" }, { status: 401 });
  }

  await loginWithOAuthProfile({
    provider: "vk",
    providerId: profile.providerId,
    name: profile.name,
    avatarUrl: profile.avatarUrl,
  });

  return NextResponse.json({ ok: true });
}
