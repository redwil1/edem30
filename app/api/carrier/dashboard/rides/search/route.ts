import { NextRequest, NextResponse } from "next/server";

import { requireCarrierOperator, searchRidesForBooking } from "@/lib/carriers";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const operator = await requireCarrierOperator();
  if (!operator || operator.role === "driver") {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const date = req.nextUrl.searchParams.get("date")?.trim() ?? "";
  const from = req.nextUrl.searchParams.get("from")?.trim() || undefined;
  const to = req.nextUrl.searchParams.get("to")?.trim() || undefined;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Укажите дату" }, { status: 400 });
  }

  const rides = await searchRidesForBooking(operator.carrier.id, { from, to, date });

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
        freeSeats: r.freeSeats,
        status: r.status,
      })),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
