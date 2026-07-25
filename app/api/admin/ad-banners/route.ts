import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin";
import { createAdBanner, listAdBanners } from "@/lib/adBanners";
import { rateLimit } from "@/lib/rateLimit";
import { isTrustedOrigin } from "@/lib/security";

export const runtime = "nodejs";

export async function GET() {
  const admin = await requireAdmin();

  if (!admin) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  return NextResponse.json(
    { banners: await listAdBanners() },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(req: NextRequest) {
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

  const limit = rateLimit(`admin-ad-create:${admin.id}`, { limit: 20, windowMs: 60_000 });

  if (!limit.allowed) {
    return NextResponse.json({ error: "Слишком много запросов" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);

  const title = typeof body?.title === "string" ? body.title : "";
  const imageUrl = typeof body?.imageUrl === "string" ? body.imageUrl : "";
  const linkUrl = typeof body?.linkUrl === "string" ? body.linkUrl : "";
  const placement = body?.placement;
  const startsAt = typeof body?.startsAt === "string" && body.startsAt ? body.startsAt : null;
  const endsAt = typeof body?.endsAt === "string" && body.endsAt ? body.endsAt : null;

  const result = await createAdBanner({ title, imageUrl, linkUrl, placement, startsAt, endsAt });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ banner: result });
}
