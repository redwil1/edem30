import { NextRequest, NextResponse } from "next/server";

import { isTrustedOrigin } from "@/lib/security";
import { freeSeats, requireCarrierOperator, swapRideVehicle } from "@/lib/carriers";

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

  const { id } = await params;
  const rideId = Number(id);

  if (!Number.isInteger(rideId) || rideId <= 0) {
    return NextResponse.json({ error: "Некорректный рейс" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const vehicleId = Number(body?.vehicleId);

  if (!Number.isInteger(vehicleId) || vehicleId <= 0) {
    return NextResponse.json({ error: "Выберите машину" }, { status: 400 });
  }

  const result = await swapRideVehicle(operator.carrier.id, rideId, vehicleId);

  if (!result.ok) {
    const messages: Record<typeof result.reason, string> = {
      not_found: "Рейс не найден",
      vehicle_not_found: "Машина не найдена",
      too_small: "В этой машине меньше мест, чем уже занято на рейсе",
      not_editable: "Рейс уже нельзя изменить",
    };
    return NextResponse.json({ error: messages[result.reason] }, { status: 409 });
  }

  return NextResponse.json({
    ok: true,
    vehicleId: result.ride.vehicleId,
    vehicleLabel: result.ride.vehicleLabel,
    totalSeats: result.ride.totalSeats,
    freeSeats: freeSeats(result.ride),
    status: result.ride.status,
  });
}
