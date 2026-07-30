import { NextResponse } from "next/server";

import {
  getAdminAccounts,
  getAdminStats,
  getPushStats,
  getVisitStats,
  requireStaff,
} from "@/lib/admin";

export const runtime = "nodejs";

export async function GET() {
  const admin = await requireStaff();

  if (!admin) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const [stats, visits, admins, push] = await Promise.all([
    getAdminStats(),
    getVisitStats(),
    getAdminAccounts(),
    getPushStats(),
  ]);

  return NextResponse.json(
    { ...stats, visits, admins, push },
    { headers: { "Cache-Control": "no-store" } }
  );
}
