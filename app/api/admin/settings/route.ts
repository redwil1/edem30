import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin";
import { getSiteSettings, SETTINGS_KEYS, updateSiteSettings } from "@/lib/siteSettings";
import { rateLimit } from "@/lib/rateLimit";
import { isTrustedOrigin } from "@/lib/security";

export const runtime = "nodejs";

export async function GET() {
  const admin = await requireAdmin();

  if (!admin) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  return NextResponse.json(
    { settings: await getSiteSettings() },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function PATCH(req: NextRequest) {
  if (!isTrustedOrigin(req)) {
    return NextResponse.json(
      { error: "Недопустимый источник запроса" },
      { status: 403 }
    );
  }

  const admin = await requireAdmin();

  if (!admin) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const limit = rateLimit(`admin-settings:${admin.id}`, { limit: 20, windowMs: 60_000 });

  if (!limit.allowed) {
    return NextResponse.json({ error: "Слишком много запросов" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);

  const updates: Record<string, string> = {};

  for (const key of SETTINGS_KEYS) {
    if (typeof body?.[key] === "string") {
      updates[key] = body[key].trim().slice(0, 200);
    }
  }

  return NextResponse.json({ settings: await updateSiteSettings(updates) });
}
