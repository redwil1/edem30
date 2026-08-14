import { NextResponse } from "next/server";

import { requireStaff } from "@/lib/admin";
import { listMarketplaceReports } from "@/lib/marketplaceReports";

export const runtime = "nodejs";

export async function GET() {
  const staff = await requireStaff();

  if (!staff) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  return NextResponse.json(
    { reports: await listMarketplaceReports() },
    { headers: { "Cache-Control": "no-store" } }
  );
}
