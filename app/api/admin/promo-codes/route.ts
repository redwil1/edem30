import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin";
import { createPromoCode, listPromoCodes } from "@/lib/promoCodes";
import { rateLimit } from "@/lib/rateLimit";
import { isTrustedOrigin } from "@/lib/security";

export const runtime = "nodejs";

export async function GET() {
  const admin = await requireAdmin();

  if (!admin) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  return NextResponse.json(
    { codes: await listPromoCodes() },
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

  const limit = rateLimit(`admin-promo-create:${admin.id}`, { limit: 20, windowMs: 60_000 });

  if (!limit.allowed) {
    return NextResponse.json({ error: "Слишком много запросов" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);

  const code = typeof body?.code === "string" ? body.code : "";
  const discountPercent = Number(body?.discountPercent);
  const maxUses =
    body?.maxUses !== null && body?.maxUses !== undefined && body?.maxUses !== ""
      ? Number(body.maxUses)
      : null;
  const expiresAt = typeof body?.expiresAt === "string" && body.expiresAt ? body.expiresAt : null;

  const result = await createPromoCode({ code, discountPercent, maxUses, expiresAt });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ code: result });
}
