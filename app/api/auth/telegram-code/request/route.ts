import { NextRequest, NextResponse } from "next/server";

import { requestTelegramLoginCode } from "@/lib/telegramBot";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp, isTrustedOrigin } from "@/lib/security";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!isTrustedOrigin(req)) {
    return NextResponse.json(
      { error: "Недопустимый источник запроса" },
      { status: 403 }
    );
  }

  const ip = getClientIp(req);
  const limit = rateLimit(`telegram-code-request:${ip}`, {
    limit: 5,
    windowMs: 10 * 60_000,
  });

  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Слишком много запросов. Попробуйте позже." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const phone = typeof body?.phone === "string" ? body.phone : "";

  const result = await requestTelegramLoginCode(phone);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
