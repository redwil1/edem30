import { NextResponse } from "next/server";

import {
  ensureRidesForDateRange,
  freeSeats,
  listBookingsForRide,
  listRidesForCarrier,
  requireCarrierOperator,
} from "@/lib/carriers";

export const runtime = "nodejs";

export async function GET() {
  const operator = await requireCarrierOperator();
  if (!operator || operator.role !== "driver") {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  if (!operator.vehicleId) {
    return NextResponse.json({ rides: [], noVehicle: true }, { headers: { "Cache-Control": "no-store" } });
  }

  await ensureRidesForDateRange(operator.carrier.id, 2);

  const today = new Date().toISOString().slice(0, 10);
  const end = new Date();
  end.setDate(end.getDate() + 1);

  const rides = await listRidesForCarrier(operator.carrier.id, {
    fromDate: today,
    toDate: end.toISOString().slice(0, 10),
    vehicleId: operator.vehicleId,
  });

  const withPassengers = await Promise.all(
    rides
      .filter((r) => r.status !== "cancelled")
      .map(async (r) => ({
        id: r.id,
        fromCity: r.fromCity,
        toCity: r.toCity,
        rideDate: r.rideDate,
        departureTime: r.departureTime,
        vehicleLabel: r.vehicleLabel,
        totalSeats: r.totalSeats,
        occupiedSeats: r.occupiedSeats,
        freeSeats: freeSeats(r),
        status: r.status,
        tripId: r.tripId,
        passengers: (await listBookingsForRide(r.id))
          .filter((b) => b.status === "active")
          .map((b) => ({
            id: b.id,
            seats: b.seats,
            passengerName: b.passengerName,
            passengerPhone: b.passengerPhone,
            pickup: b.pickup,
            dropoff: b.dropoff,
            comment: b.comment,
            source: b.source,
            userId: b.userId,
          })),
      }))
  );

  return NextResponse.json(
    { rides: withPassengers, noVehicle: false },
    { headers: { "Cache-Control": "no-store" } }
  );
}
