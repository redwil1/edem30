import { NextRequest, NextResponse } from "next/server";

import { listAdminTaxiOrders, requireAdmin } from "@/lib/admin";

export const runtime = "nodejs";

const VALID_STATUSES = ["open", "accepted", "cancelled"];

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();

  if (!admin) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const statusParam = req.nextUrl.searchParams.get("status") ?? undefined;
  const status = statusParam && VALID_STATUSES.includes(statusParam) ? statusParam : undefined;

  return NextResponse.json(
    { orders: await listAdminTaxiOrders(status) },
    { headers: { "Cache-Control": "no-store" } }
  );
}
