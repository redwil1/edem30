import { NextRequest, NextResponse } from "next/server";

import { rateLimit } from "@/lib/rateLimit";
import { isTrustedOrigin } from "@/lib/security";
import { createBooking, requireCarrierOperator } from "@/lib/carriers";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!isTrustedOrigin(req)) {
    return NextResponse.json({ error: "Недопустимый источник запроса" }, { status: 403 });
  }

  const operator = await requireCarrierOperator();
  if (!operator || operator.role === "driver") {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const limit = rateLimit(`carrier-booking-create:${operator.userId}`, { limit: 60, windowMs: 60 * 60_000 });
  if (!limit.allowed) {
    return NextResponse.json({ error: "Слишком много запросов" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);

  const rideId = Number(body?.rideId);
  const seats = Number(body?.seats);
  const passengerName = typeof body?.passengerName === "string" ? body.passengerName.trim().slice(0, 80) : "";
  const passengerPhone = typeof body?.passengerPhone === "string" ? body.passengerPhone.trim().slice(0, 20) : "";
  const pickup = typeof body?.pickup === "string" ? body.pickup.trim().slice(0, 200) : "";
  const dropoff = typeof body?.dropoff === "string" ? body.dropoff.trim().slice(0, 200) : "";
  const comment = typeof body?.comment === "string" ? body.comment.trim().slice(0, 300) : "";
  const userId = Number.isInteger(Number(body?.userId)) && Number(body?.userId) > 0 ? Number(body.userId) : undefined;

  if (!Number.isInteger(rideId) || rideId <= 0) {
    return NextResponse.json({ error: "Некорректный рейс" }, { status: 400 });
  }
  if (!Number.isInteger(seats) || seats <= 0 || seats > 20) {
    return NextResponse.json({ error: "Некорректное количество мест" }, { status: 400 });
  }
  if (!passengerName) {
    return NextResponse.json({ error: "Укажите имя пассажира" }, { status: 400 });
  }

  const result = await createBooking(operator.carrier.id, rideId, {
    seats,
    passengerName,
    passengerPhone: passengerPhone || undefined,
    pickup: pickup || undefined,
    dropoff: dropoff || undefined,
    comment: comment || undefined,
    // Если бронь оформляется по известному пользователю Едем30 (например, из
    // заявки «Хочу поехать») — она должна попасть в trip_participants/чат
    // как обычная бронь через приложение, а не как звонок оператору.
    source: userId ? "edem30" : "operator",
    userId,
    createdBy: operator.userId,
  });

  if (!result.ok) {
    const messages: Record<typeof result.reason, string> = {
      not_found: "Рейс не найден",
      not_open: "Рейс закрыт",
      not_enough_seats: "Недостаточно свободных мест",
      missing_user_id: "Некорректные данные",
      seat_taken: "Это место уже занято",
    };
    return NextResponse.json({ error: messages[result.reason] }, { status: 409 });
  }

  return NextResponse.json({ ok: true, bookingId: result.booking.id });
}
