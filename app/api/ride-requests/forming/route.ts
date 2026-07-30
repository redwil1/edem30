import { NextResponse } from "next/server";

import { clusterRideRequests, listOpenRideRequests, uniqueByPassenger } from "@/lib/rideRequests";

export const runtime = "nodejs";

export async function GET() {
  const open = await listOpenRideRequests();
  const clusters = clusterRideRequests(open);

  return NextResponse.json(
    {
      clusters: clusters.map((c) => ({
        from: c.from,
        to: c.to,
        date: c.date,
        time: c.time,
        waitingCount: c.waitingCount,
        tripId: c.requests.find((r) => r.tripId !== null)?.tripId ?? null,
        requestIds: c.requests.map((r) => r.id),
        passengers: uniqueByPassenger(c.requests).map((r) => ({
          id: r.passengerId,
          name: r.passengerName,
          avatarUrl: r.passengerAvatarUrl,
          avatarPreset: r.passengerAvatarPreset,
          count: r.passengersCount,
          comment: r.comment,
        })),
      })),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
