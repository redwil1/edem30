import { NextRequest, NextResponse } from "next/server";

import { requireStaff } from "@/lib/admin";
import { getMarketplaceAdminStats, listAllListingsForAdmin } from "@/lib/marketplace";

export const runtime = "nodejs";

const VALID_STATUSES = ["active", "reserved", "sold", "archived"];

export async function GET(req: NextRequest) {
  const staff = await requireStaff();

  if (!staff) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const statusParam = req.nextUrl.searchParams.get("status");
  const status = VALID_STATUSES.includes(statusParam ?? "")
    ? (statusParam as "active" | "reserved" | "sold" | "archived")
    : undefined;

  const [listings, stats] = await Promise.all([
    listAllListingsForAdmin(status),
    getMarketplaceAdminStats(),
  ]);

  return NextResponse.json(
    { listings, stats },
    { headers: { "Cache-Control": "no-store" } }
  );
}
