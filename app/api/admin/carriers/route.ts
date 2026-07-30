import { NextResponse } from "next/server";

import { getCarrierAdminOverview, requireStaff } from "@/lib/admin";

export const runtime = "nodejs";

export async function GET() {
  const admin = await requireStaff();

  if (!admin) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  return NextResponse.json(await getCarrierAdminOverview(), {
    headers: { "Cache-Control": "no-store" },
  });
}
