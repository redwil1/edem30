import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import { sql } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp, isTrustedOrigin } from "@/lib/security";
import { fetchVkUserInfo } from "@/lib/vkAuth";
import { parseSourceCookie, SOURCE_COOKIE_NAME } from "@/lib/traffic";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!isTrustedOrigin(req)) {
    return NextResponse.json(
      { error: "Недопустимый источник запроса" },
      { status: 403 }
    );
  }

  const ip = getClientIp(req);
  const limit = rateLimit(`vk-auth:${ip}`, { limit: 15, windowMs: 15 * 60_000 });

  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Слишком много попыток. Попробуйте позже." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const accessToken = typeof body?.accessToken === "string" ? body.accessToken : "";

  if (!accessToken) {
    return NextResponse.json({ error: "Некорректные данные входа" }, { status: 400 });
  }

  const profile = await fetchVkUserInfo(accessToken);

  if (!profile) {
    return NextResponse.json(
      { error: "Не удалось подтвердить вход через VK. Попробуйте ещё раз." },
      { status: 401 }
    );
  }

  const existing = await sql<{ id: number; is_blocked: boolean }[]>`
    SELECT id, is_blocked FROM users WHERE vk_id = ${profile.externalId}
  `;

  let userId: number;

  if (existing.length > 0) {
    if (existing[0].is_blocked) {
      return NextResponse.json({ error: "Аккаунт заблокирован" }, { status: 403 });
    }

    userId = existing[0].id;
  } else {
    const cookieStore = await cookies();
    const sourceInfo = parseSourceCookie(cookieStore.get(SOURCE_COOKIE_NAME)?.value);
    const now = new Date().toISOString();

    const inserted = await sql<{ id: number }[]>`
      INSERT INTO users (
        name, avatar_url, vk_id, data_consent_at,
        signup_source, signup_utm_source, signup_utm_medium, signup_utm_campaign,
        signup_utm_content, signup_utm_term
      )
      VALUES (
        ${profile.name}, ${profile.avatarUrl}, ${profile.externalId}, ${now},
        'vk', ${sourceInfo?.utmSource ?? null},
        ${sourceInfo?.utmMedium ?? null}, ${sourceInfo?.utmCampaign ?? null},
        ${sourceInfo?.utmContent ?? null}, ${sourceInfo?.utmTerm ?? null}
      )
      RETURNING id
    `;

    userId = inserted[0].id;
  }

  await createSession(userId);

  return NextResponse.json({ id: userId });
}
