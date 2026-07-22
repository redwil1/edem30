import { NextRequest, NextResponse } from "next/server";

import { sql } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getClientIp, isTrustedOrigin } from "@/lib/security";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!isTrustedOrigin(req)) {
    return NextResponse.json({ error: "Недопустимый источник запроса" }, { status: 403 });
  }

  const ip = getClientIp(req);

  const limit = rateLimit(`track-visit:${ip}`, { limit: 10, windowMs: 60_000 });

  if (!limit.allowed) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  const user = await getCurrentUser();

  await sql`
    INSERT INTO site_visits (user_id, ip, created_at)
    VALUES (${user?.id ?? null}, ${ip}, ${new Date().toISOString()})
  `;

  return NextResponse.json({ ok: true });
}
