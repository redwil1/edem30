import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { verifyEmailCode } from "@/lib/emailVerification";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp, isTrustedOrigin } from "@/lib/security";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!isTrustedOrigin(req)) {
    return NextResponse.json({ error: "Недопустимый источник запроса" }, { status: 403 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }

  const ip = getClientIp(req);
  const limit = rateLimit(`profile-email-confirm:${user.id}:${ip}`, {
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
  const email = typeof body?.email === "string" ? body.email : "";
  const code = typeof body?.code === "string" ? body.code.trim() : "";

  const result = await verifyEmailCode(email, code);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  try {
    await sql`UPDATE users SET email = ${result.email} WHERE id = ${user.id}`;
  } catch {
    return NextResponse.json(
      { error: "Эта почта уже привязана к другому аккаунту" },
      { status: 409 }
    );
  }

  return NextResponse.json({ ok: true, email: result.email });
}
