import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { rateLimit } from "@/lib/rateLimit";
import { isTrustedOrigin } from "@/lib/security";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }

  const [row] = await sql<{ email: string | null; emailNotifyFallback: boolean }[]>`
    SELECT email, email_notify_fallback as "emailNotifyFallback" FROM users WHERE id = ${user.id}
  `;

  return NextResponse.json(
    { email: row?.email ?? null, emailNotifyFallback: row?.emailNotifyFallback ?? true },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function PATCH(req: NextRequest) {
  if (!isTrustedOrigin(req)) {
    return NextResponse.json({ error: "Недопустимый источник запроса" }, { status: 403 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }

  const limit = rateLimit(`profile-notifications:${user.id}`, { limit: 20, windowMs: 60_000 });
  if (!limit.allowed) {
    return NextResponse.json({ error: "Слишком много запросов" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  if (typeof body?.emailNotifyFallback !== "boolean") {
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  }

  await sql`UPDATE users SET email_notify_fallback = ${body.emailNotifyFallback} WHERE id = ${user.id}`;

  return NextResponse.json({ ok: true });
}
