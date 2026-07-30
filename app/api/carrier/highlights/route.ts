import { NextResponse } from "next/server";

import { freeSeats, listCarrierHighlights } from "@/lib/carriers";

export const runtime = "nodejs";

export async function GET() {
  const highlights = await listCarrierHighlights();

  return NextResponse.json(
    {
      highlights: highlights.map((h) => ({
        slug: h.carrier.slug,
        name: h.carrier.name,
        ride: h.ride
          ? {
              fromCity: h.ride.fromCity,
              toCity: h.ride.toCity,
              rideDate: h.ride.rideDate,
              departureTime: h.ride.departureTime,
              price: h.ride.price,
              freeSeats: freeSeats(h.ride),
            }
          : null,
      })),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
