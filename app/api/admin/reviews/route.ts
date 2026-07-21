import { NextRequest, NextResponse } from "next/server";

import { listAdminReviews, requireAdmin } from "@/lib/admin";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();

  if (!admin) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const minRatingParam = req.nextUrl.searchParams.get("minRating");
  const minRating = minRatingParam ? Number(minRatingParam) : undefined;

  return NextResponse.json(
    { reviews: listAdminReviews(minRating) },
    { headers: { "Cache-Control": "no-store" } }
  );
}
