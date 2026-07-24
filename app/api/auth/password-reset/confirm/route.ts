import { NextRequest, NextResponse } from "next/server";

import { confirmPasswordReset } from "@/lib/passwordReset";
import { createSession } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp, isTrustedOrigin } from "@/lib/security";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!isTrustedOrigin(req)) {
    return NextResponse.json({ error: "Недопустимый источник запроса" }, { status: 403 });
  }

  const ip = getClientIp(req);
  const limit = rateLimit(`password-reset-confirm:${ip}`, { limit: 10, windowMs: 15 * 60_000 });

  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Слишком много попыток. Попробуйте позже." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const phone = typeof body?.phone === "string" ? body.phone : "";
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  const newPassword = typeof body?.newPassword === "string" ? body.newPassword.slice(0, 200) : "";

  if (newPassword.length < 7) {
    return NextResponse.json(
      { error: "Пароль должен быть не короче 7 символов" },
      { status: 400 }
    );
  }

  const result = await confirmPasswordReset(phone, code, newPassword);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  await createSession(result.userId);

  return NextResponse.json({ ok: true });
}
