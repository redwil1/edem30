import { NextRequest, NextResponse } from "next/server";

import {
  ensureRidesForDateRange,
  findMatchingRideRequestClusters,
  freeSeats,
  getCarrierForAdminView,
  getCarrierTodayStats,
  listEmployees,
  listRidesForCarrier,
  listSchedules,
  listVehicles,
  requireCarrierOperator,
} from "@/lib/carriers";

export const runtime = "nodejs";

const DAYS_AHEAD = 14;

export async function GET(req: NextRequest) {
  const operator = await requireCarrierOperator();

  // У водителя отдельный простой мобильный кабинет /carrier/driver — сюда доступа нет.
  if (operator && operator.role === "driver") {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const adminCarrierId = Number(req.nextUrl.searchParams.get("carrierId"));
  const readOnly = !operator && Number.isInteger(adminCarrierId) && adminCarrierId > 0;

  const carrier = operator
    ? operator.carrier
    : readOnly
    ? await getCarrierForAdminView(adminCarrierId)
    : null;

  if (!carrier) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const operatorCarrierId = carrier.id;
  const role = operator?.role ?? "manager";

  await ensureRidesForDateRange(operatorCarrierId, DAYS_AHEAD);

  const today = new Date().toISOString().slice(0, 10);
  const end = new Date();
  end.setDate(end.getDate() + DAYS_AHEAD);

  const [rides, vehicles, schedules, stats, matches, employees] = await Promise.all([
    listRidesForCarrier(operatorCarrierId, {
      fromDate: today,
      toDate: end.toISOString().slice(0, 10),
    }),
    listVehicles(operatorCarrierId),
    listSchedules(operatorCarrierId),
    getCarrierTodayStats(operatorCarrierId),
    readOnly ? [] : findMatchingRideRequestClusters(operatorCarrierId),
    listEmployees(operatorCarrierId),
  ]);

  const drivers = employees.filter((e) => e.role === "driver").map((e) => ({ userId: e.userId, name: e.name }));

  return NextResponse.json(
    {
      carrier,
      readOnly,
      role,
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
        driverUserId: r.driverUserId,
        driverName: r.driverName,
      })),
      vehicles,
      schedules,
      drivers,
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
