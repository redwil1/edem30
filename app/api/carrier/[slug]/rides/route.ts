import { NextResponse } from "next/server";

import { sql } from "@/lib/db";
import { ensureRidesForDateRange, freeSeats, getCarrierBySlug, listRidesForCarrier } from "@/lib/carriers";

export const runtime = "nodejs";

const DAYS_AHEAD = 7;

type Props = {
  params: Promise<{ slug: string }>;
};

export async function GET(_req: Request, { params }: Props) {
  const { slug } = await params;
  const carrier = await getCarrierBySlug(slug);

  if (!carrier) {
    return NextResponse.json({ error: "Перевозчик не найден" }, { status: 404 });
  }

  await ensureRidesForDateRange(carrier.id, DAYS_AHEAD);

  const today = new Date().toISOString().slice(0, 10);
  const end = new Date();
  end.setDate(end.getDate() + DAYS_AHEAD);

  const rides = await listRidesForCarrier(carrier.id, {
    fromDate: today,
    toDate: end.toISOString().slice(0, 10),
    publicOnly: true,
  });

  const withRidersCount = await Promise.all(
    rides.map(async (r) => {
      let ridersCount = 0;

      if (r.tripId !== null) {
        const [row] = await sql<{ c: string }[]>`
          SELECT COUNT(*) as c FROM trip_participants WHERE trip_id = ${r.tripId}
        `;
        ridersCount = Number(row.c);
      }

      return {
        id: r.id,
        fromCity: r.fromCity,
        toCity: r.toCity,
        rideDate: r.rideDate,
        departureTime: r.departureTime,
        price: r.price,
        vehicleLabel: r.vehicleLabel,
        totalSeats: r.totalSeats,
        freeSeats: freeSeats(r),
        status: r.status,
        ridersCount,
      };
    })
  );

  return NextResponse.json({ rides: withRidersCount }, { headers: { "Cache-Control": "no-store" } });
}
