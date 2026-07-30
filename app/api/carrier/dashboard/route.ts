import { NextResponse } from "next/server";

import {
  ensureRidesForDateRange,
  findMatchingRideRequestClusters,
  freeSeats,
  getCarrierTodayStats,
  listRidesForCarrier,
  listSchedules,
  listVehicles,
  requireCarrierOperator,
} from "@/lib/carriers";

export const runtime = "nodejs";

const DAYS_AHEAD = 2;

export async function GET() {
  const operator = await requireCarrierOperator();

  if (!operator) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  await ensureRidesForDateRange(operator.carrier.id, DAYS_AHEAD);

  const today = new Date().toISOString().slice(0, 10);
  const end = new Date();
  end.setDate(end.getDate() + DAYS_AHEAD);

  const [rides, vehicles, schedules, stats, matches] = await Promise.all([
    listRidesForCarrier(operator.carrier.id, {
      fromDate: today,
      toDate: end.toISOString().slice(0, 10),
    }),
    listVehicles(operator.carrier.id),
    listSchedules(operator.carrier.id),
    getCarrierTodayStats(operator.carrier.id),
    findMatchingRideRequestClusters(operator.carrier.id),
  ]);

  return NextResponse.json(
    {
      carrier: operator.carrier,
      rides: rides.map((r) => ({
        id: r.id,
        fromCity: r.fromCity,
        toCity: r.toCity,
        rideDate: r.rideDate,
        departureTime: r.departureTime,
        price: r.price,
        vehicleId: r.vehicleId,
        vehicleLabel: r.vehicleLabel,
        totalSeats: r.totalSeats,
        occupiedSeats: r.occupiedSeats,
        freeSeats: freeSeats(r),
        status: r.status,
      })),
      vehicles,
      schedules,
      stats,
      matches: matches.map((m) => ({
        carrierRideId: m.carrierRide.id,
        from: m.cluster.from,
        to: m.cluster.to,
        date: m.cluster.date,
        time: m.cluster.time,
        waitingCount: m.cluster.waitingCount,
      })),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
