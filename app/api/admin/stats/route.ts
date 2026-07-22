import { NextResponse } from "next/server";

import { getAdminAccounts, getAdminStats, getVisitStats, requireAdmin } from "@/lib/admin";

export const runtime = "nodejs";

export async function GET() {
  const admin = await requireAdmin();

  if (!admin) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const [stats, visits, admins] = await Promise.all([
    getAdminStats(),
    getVisitStats(),
    getAdminAccounts(),
  ]);

  return NextResponse.json(
    { ...stats, visits, admins },
    { headers: { "Cache-Control": "no-store" } }
  );
}
