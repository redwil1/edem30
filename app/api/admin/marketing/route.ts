import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin";
import { getMarketingStats } from "@/lib/marketing";

export const runtime = "nodejs";

export async function GET() {
  const admin = await requireAdmin();

  if (!admin) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const stats = await getMarketingStats();

  return NextResponse.json(stats, { headers: { "Cache-Control": "no-store" } });
}
