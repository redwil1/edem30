import { NextRequest, NextResponse } from "next/server";

import { findMatchingCluster } from "@/lib/rideRequests";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const from = req.nextUrl.searchParams.get("from")?.trim() ?? "";
  const to = req.nextUrl.searchParams.get("to")?.trim() ?? "";
  const date = req.nextUrl.searchParams.get("date")?.trim() ?? "";
  const time = req.nextUrl.searchParams.get("time")?.trim() ?? "";

  if (!from || !to || !date || !time) {
    return NextResponse.json({ cluster: null });
  }

  const cluster = await findMatchingCluster(from, to, date, time);

  if (!cluster) {
    return NextResponse.json({ cluster: null });
  }

  return NextResponse.json({
    cluster: {
      from: cluster.from,
      to: cluster.to,
      date: cluster.date,
      time: cluster.time,
      waitingCount: cluster.waitingCount,
      requestsCount: cluster.requests.length,
    },
  });
}
