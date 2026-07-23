import { NextRequest, NextResponse } from "next/server";

import { listAdminReviews, requireStaff } from "@/lib/admin";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const admin = await requireStaff();

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
