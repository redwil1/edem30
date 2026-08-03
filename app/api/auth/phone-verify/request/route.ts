import { NextRequest, NextResponse } from "next/server";

import { normalizePhone } from "@/lib/phone";
import { requestPhoneVerificationCode } from "@/lib/phoneVerification";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp, isTrustedOrigin } from "@/lib/security";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!isTrustedOrigin(req)) {
    return NextResponse.json({ error: "Недопустимый источник запроса" }, { status: 403 });
  }

  const ip = getClientIp(req);
  const limit = rateLimit(`phone-verify-request:${ip}`, { limit: 5, windowMs: 15 * 60_000 });

  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Слишком много попыток. Попробуйте позже." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const phoneRaw = typeof body?.phone === "string" ? body.phone : "";
  const phone = normalizePhone(phoneRaw);

  if (phone.length !== 11) {
    return NextResponse.json({ error: "Номер телефона должен содержать 11 цифр" }, { status: 400 });
  }

  const result = await requestPhoneVerificationCode(phone);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
