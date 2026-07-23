import { NextRequest, NextResponse } from "next/server";

import { listAdminTrips, requireStaff } from "@/lib/admin";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const admin = await requireStaff();

  if (!admin) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const search = req.nextUrl.searchParams.get("search")?.trim() || undefined;

  return NextResponse.json(
    { trips: await listAdminTrips(search) },
    { headers: { "Cache-Control": "no-store" } }
  );
}
