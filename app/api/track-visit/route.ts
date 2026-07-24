import { NextRequest, NextResponse } from "next/server";

import { sql } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getClientIp, isTrustedOrigin } from "@/lib/security";
import { rateLimit } from "@/lib/rateLimit";
import { isTrafficSource } from "@/lib/traffic";

export const runtime = "nodejs";

function str(value: unknown, maxLen = 200): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, maxLen) : null;
}

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
  const body = await req.json().catch(() => null);

  const source = isTrafficSource(body?.source) ? body.source : "other";
  const utmSource = str(body?.utmSource);
  const utmMedium = str(body?.utmMedium);
  const utmCampaign = str(body?.utmCampaign);
  const utmContent = str(body?.utmContent);
  const utmTerm = str(body?.utmTerm);
  const landingPath = str(body?.landingPath);

  await sql`
    INSERT INTO site_visits (
      user_id, ip, created_at, source, utm_source, utm_medium, utm_campaign, utm_content, utm_term, landing_path
    )
    VALUES (
      ${user?.id ?? null}, ${ip}, ${new Date().toISOString()},
      ${source}, ${utmSource}, ${utmMedium}, ${utmCampaign}, ${utmContent}, ${utmTerm}, ${landingPath}
    )
  `;

  return NextResponse.json({ ok: true });
}
