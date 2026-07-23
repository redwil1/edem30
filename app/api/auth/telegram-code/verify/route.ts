import { NextRequest, NextResponse } from "next/server";

import { findOrCreateUserByVerifiedPhone, verifyTelegramLoginCode } from "@/lib/telegramBot";
import { createSession } from "@/lib/auth";
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
  const limit = rateLimit(`telegram-code-verify:${ip}`, {
    limit: 10,
    windowMs: 10 * 60_000,
  });

  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Слишком много попыток. Попробуйте позже." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const phone = typeof body?.phone === "string" ? body.phone : "";
  const code = typeof body?.code === "string" ? body.code.trim() : "";

  if (!code) {
    return NextResponse.json({ error: "Введите код" }, { status: 400 });
  }

  const result = await verifyTelegramLoginCode(phone, code);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const userId = await findOrCreateUserByVerifiedPhone(result.phone);
  await createSession(userId);

  return NextResponse.json({ ok: true });
}
