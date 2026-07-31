import { NextRequest, NextResponse } from "next/server";

import { isTrustedOrigin } from "@/lib/security";
import { getCarrierRide, requireCarrierOperator, setRideDepartedOrCompleted } from "@/lib/carriers";

export const runtime = "nodejs";

type Props = {
  params: Promise<{ id: string }>;
};

export async function POST(req: NextRequest, { params }: Props) {
  if (!isTrustedOrigin(req)) {
    return NextResponse.json({ error: "Недопустимый источник запроса" }, { status: 403 });
  }

  const operator = await requireCarrierOperator();
  if (!operator || operator.role !== "driver" || !operator.vehicleId) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const { id } = await params;
  const rideId = Number(id);

  if (!Number.isInteger(rideId) || rideId <= 0) {
    return NextResponse.json({ error: "Некорректный рейс" }, { status: 400 });
  }

  const ride = await getCarrierRide(rideId);
  if (!ride || ride.carrierId !== operator.carrier.id || ride.vehicleId !== operator.vehicleId) {
    return NextResponse.json({ error: "Рейс не найден" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const status = body?.status;

  if (status !== "departed" && status !== "completed") {
    return NextResponse.json({ error: "Некорректный статус" }, { status: 400 });
  }

  const result = await setRideDepartedOrCompleted(operator.carrier.id, rideId, status);

  if (!result.ok) {
    return NextResponse.json({ error: "Недопустимый переход статуса" }, { status: 409 });
  }

  return NextResponse.json({ ok: true });
}
