import { NextRequest, NextResponse } from "next/server";

import { isTrustedOrigin } from "@/lib/security";
import { assignRideDriver, requireCarrierOperator } from "@/lib/carriers";

export const runtime = "nodejs";

type Props = {
  params: Promise<{ id: string }>;
};

export async function POST(req: NextRequest, { params }: Props) {
  if (!isTrustedOrigin(req)) {
    return NextResponse.json({ error: "Недопустимый источник запроса" }, { status: 403 });
  }

  const operator = await requireCarrierOperator();
  if (!operator || operator.role !== "manager") {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const { id } = await params;
  const rideId = Number(id);

  if (!Number.isInteger(rideId) || rideId <= 0) {
    return NextResponse.json({ error: "Некорректный рейс" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const driverUserId = body?.driverUserId === null ? null : Number(body?.driverUserId);

  if (driverUserId !== null && (!Number.isInteger(driverUserId) || driverUserId <= 0)) {
    return NextResponse.json({ error: "Некорректный водитель" }, { status: 400 });
  }

  const result = await assignRideDriver(operator.carrier.id, rideId, driverUserId);

  if (!result.ok) {
    const message = result.reason === "not_found" ? "Рейс не найден" : "Этот пользователь не является водителем перевозчика";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
