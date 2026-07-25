import { NextRequest, NextResponse } from "next/server";

import { getActiveBannerForPlacement, isValidPlacement } from "@/lib/adBanners";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const placement = req.nextUrl.searchParams.get("placement");

  if (!isValidPlacement(placement)) {
    return NextResponse.json({ error: "Некорректное место показа" }, { status: 400 });
  }

  const banner = await getActiveBannerForPlacement(placement);

  return NextResponse.json(
    { banner },
    { headers: { "Cache-Control": "no-store" } }
  );
}
