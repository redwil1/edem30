import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";
import { isTrustedOrigin } from "@/lib/security";
import { createMarketplaceReport } from "@/lib/marketplaceReports";
import { isValidMarketplaceReportCategory } from "@/data/marketplaceReportCategories";

export const runtime = "nodejs";

type Props = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Props) {
  if (!isTrustedOrigin(req)) {
    return NextResponse.json({ error: "Недопустимый источник запроса" }, { status: 403 });
  }

  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Войдите в аккаунт" }, { status: 401 });
  }

  const { id } = await params;
  const listingId = Number(id);

  if (!Number.isInteger(listingId) || listingId <= 0) {
    return NextResponse.json({ error: "Некорректное объявление" }, { status: 400 });
  }

  const limit = rateLimit(`marketplace-report:${user.id}`, { limit: 10, windowMs: 60_000 });

  if (!limit.allowed) {
    return NextResponse.json({ error: "Слишком много запросов" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const category = body?.category;
  const description =
    typeof body?.description === "string" ? body.description.trim().slice(0, 500) : "";

  if (!isValidMarketplaceReportCategory(category)) {
    return NextResponse.json({ error: "Выберите причину жалобы" }, { status: 400 });
  }

  await createMarketplaceReport({
    listingId,
    reporterId: user.id,
    category,
    description: description || undefined,
  });

  return NextResponse.json({ ok: true });
}
