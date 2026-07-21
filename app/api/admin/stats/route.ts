import { NextResponse } from "next/server";

import { getAdminStats, requireAdmin } from "@/lib/admin";

export const runtime = "nodejs";

export async function GET() {
  const admin = await requireAdmin();

  if (!admin) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  return NextResponse.json(await getAdminStats(), {
    headers: { "Cache-Control": "no-store" },
  });
}
