import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin";
import { BonusStatus, getBonusStats, listBonusTrips } from "@/lib/driverBonuses";

export const runtime = "nodejs";

const VALID_STATUSES: BonusStatus[] = ["pending", "approved", "paid", "rejected"];

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const params = req.nextUrl.searchParams;
  const statusParam = params.get("status");
  const status = statusParam && VALID_STATUSES.includes(statusParam as BonusStatus) ? (statusParam as BonusStatus) : undefined;

  const [trips, stats] = await Promise.all([
    listBonusTrips({
      dateFrom: params.get("dateFrom") || undefined,
      dateTo: params.get("dateTo") || undefined,
      driverSearch: params.get("driver") || undefined,
      from: params.get("from") || undefined,
      to: params.get("to") || undefined,
      status,
    }),
    getBonusStats(),
  ]);

  return NextResponse.json({ trips, stats }, { headers: { "Cache-Control": "no-store" } });
}
