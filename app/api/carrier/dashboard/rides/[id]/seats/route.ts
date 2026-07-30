import { NextRequest, NextResponse } from "next/server";

import { rateLimit } from "@/lib/rateLimit";
import { isTrustedOrigin } from "@/lib/security";
import { adjustSeats, freeSeats, requireCarrierOperator } from "@/lib/carriers";

export const runtime = "nodejs";

type Props = {
  params: Promise<{ id: string }>;
};

export async function POST(req: NextRequest, { params }: Props) {
  if (!isTrustedOrigin(req)) {
    return NextResponse.json({ error: "Недопустимый источник запроса" }, { status: 403 });
  }

  const operator = await requireCarrierOperator();
  if (!operator) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const limit = rateLimit(`carrier-seats:${operator.userId}`, { limit: 120, windowMs: 60_000 });
  if (!limit.allowed) {
    return NextResponse.json({ error: "Слишком много запросов" }, { status: 429 });
  }

  const { id } = await params;
  const rideId = Number(id);

  if (!Number.isInteger(rideId) || rideId <= 0) {
    return NextResponse.json({ error: "Некорректный рейс" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const delta = Number(body?.delta);

  if (![1, -1].includes(delta)) {
    return NextResponse.json({ error: "Некорректное изменение" }, { status: 400 });
  }

  const result = await adjustSeats(operator.carrier.id, rideId, delta);

  if (!result.ok) {
    const message =
      result.reason === "not_found" ? "Рейс не найден" : "Достигнут предел мест";
    return NextResponse.json({ error: message }, { status: 409 });
  }

  return NextResponse.json({
    ok: true,
    occupiedSeats: result.ride.occupiedSeats,
    freeSeats: freeSeats(result.ride),
    status: result.ride.status,
  });
}
