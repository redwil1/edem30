import { NextResponse } from "next/server";

import { getLiveStats } from "@/lib/liveStats";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(await getLiveStats(), {
    headers: { "Cache-Control": "no-store" },
  });
}
