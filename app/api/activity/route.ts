import { NextResponse } from "next/server";

import { getActivityWindow, getRecentActivity } from "@/lib/liveStats";

export const runtime = "nodejs";

export async function GET() {
  const [recent, window] = await Promise.all([
    getRecentActivity(8),
    getActivityWindow(10),
  ]);

  return NextResponse.json(
    { recent, window },
    { headers: { "Cache-Control": "no-store" } }
  );
}
