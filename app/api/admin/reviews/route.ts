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

  const tripTypeParam = req.nextUrl.searchParams.get("tripType");
  const tripType =
    tripTypeParam === "intercity" || tripTypeParam === "city" ? tripTypeParam : undefined;

  return NextResponse.json(
    { reviews: await listAdminReviews(minRating, tripType) },
    { headers: { "Cache-Control": "no-store" } }
  );
}
