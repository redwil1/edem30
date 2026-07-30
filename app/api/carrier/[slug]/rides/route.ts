import { NextResponse } from "next/server";

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

  return NextResponse.json(
    {
      rides: rides.map((r) => ({
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
      })),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
