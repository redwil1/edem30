import { NextRequest, NextResponse } from "next/server";

import { rateLimit } from "@/lib/rateLimit";
import { isTrustedOrigin } from "@/lib/security";
import { createBooking, getCarrierRide, requireCarrierOperator } from "@/lib/carriers";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!isTrustedOrigin(req)) {
    return NextResponse.json({ error: "Недопустимый источник запроса" }, { status: 403 });
  }

  const operator = await requireCarrierOperator();
  if (!operator || operator.role !== "driver") {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const limit = rateLimit(`carrier-driver-book:${operator.userId}`, { limit: 120, windowMs: 60_000 });
  if (!limit.allowed) {
    return NextResponse.json({ error: "Слишком много запросов" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const rideId = Number(body?.rideId);

  if (!Number.isInteger(rideId) || rideId <= 0) {
    return NextResponse.json({ error: "Некорректный рейс" }, { status: 400 });
  }

  const ride = await getCarrierRide(rideId);
  if (!ride || ride.carrierId !== operator.carrier.id || ride.driverUserId !== operator.userId) {
    return NextResponse.json({ error: "Рейс не найден" }, { status: 404 });
  }

  const result = await createBooking(operator.carrier.id, rideId, {
    seats: 1,
    passengerName: "Пассажир",
    source: "operator",
    createdBy: operator.userId,
  });

  if (!result.ok) {
    const messages: Record<typeof result.reason, string> = {
      not_found: "Рейс не найден",
      not_open: "Рейс закрыт",
      not_enough_seats: "Мест не осталось",
      missing_user_id: "Некорректные данные",
    };
    return NextResponse.json({ error: messages[result.reason] }, { status: 409 });
  }

  return NextResponse.json({ ok: true, bookingId: result.booking.id });
}
