import { NextRequest, NextResponse } from "next/server";

import { isTrustedOrigin } from "@/lib/security";
import { requireCarrierOperator, updateBooking } from "@/lib/carriers";

export const runtime = "nodejs";

type Props = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: NextRequest, { params }: Props) {
  if (!isTrustedOrigin(req)) {
    return NextResponse.json({ error: "Недопустимый источник запроса" }, { status: 403 });
  }

  const operator = await requireCarrierOperator();
  if (!operator || operator.role === "driver") {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const { id } = await params;
  const bookingId = Number(id);

  if (!Number.isInteger(bookingId) || bookingId <= 0) {
    return NextResponse.json({ error: "Некорректная бронь" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);

  const patch: {
    seats?: number;
    passengerName?: string;
    passengerPhone?: string | null;
    pickup?: string | null;
    dropoff?: string | null;
    comment?: string | null;
  } = {};

  if (body?.seats !== undefined) {
    const seats = Number(body.seats);
    if (!Number.isInteger(seats) || seats <= 0 || seats > 20) {
      return NextResponse.json({ error: "Некорректное количество мест" }, { status: 400 });
    }
    patch.seats = seats;
  }
  if (typeof body?.passengerName === "string") {
    const passengerName = body.passengerName.trim().slice(0, 80);
    if (!passengerName) {
      return NextResponse.json({ error: "Укажите имя пассажира" }, { status: 400 });
    }
    patch.passengerName = passengerName;
  }
  if (body?.passengerPhone !== undefined) {
    patch.passengerPhone = typeof body.passengerPhone === "string" ? body.passengerPhone.trim().slice(0, 20) || null : null;
  }
  if (body?.pickup !== undefined) {
    patch.pickup = typeof body.pickup === "string" ? body.pickup.trim().slice(0, 200) || null : null;
  }
  if (body?.dropoff !== undefined) {
    patch.dropoff = typeof body.dropoff === "string" ? body.dropoff.trim().slice(0, 200) || null : null;
  }
  if (body?.comment !== undefined) {
    patch.comment = typeof body.comment === "string" ? body.comment.trim().slice(0, 300) || null : null;
  }

  const result = await updateBooking(operator.carrier.id, bookingId, patch);

  if (!result.ok) {
    const messages: Record<typeof result.reason, string> = {
      not_found: "Бронь не найдена",
      not_open: "Рейс закрыт для изменений",
      not_enough_seats: "Недостаточно свободных мест",
    };
    return NextResponse.json({ error: messages[result.reason] }, { status: 409 });
  }

  return NextResponse.json({ ok: true, booking: result.booking });
}
