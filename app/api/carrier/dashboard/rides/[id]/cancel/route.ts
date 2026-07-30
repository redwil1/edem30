import { NextRequest, NextResponse } from "next/server";

import { isTrustedOrigin } from "@/lib/security";
import { cancelCarrierRide, requireCarrierOperator } from "@/lib/carriers";

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

  const result = await cancelCarrierRide(operator.carrier.id, rideId);

  if (!result.ok) {
    const message = result.reason === "not_found" ? "Рейс не найден" : "Рейс уже завершён или отменён";
    return NextResponse.json({ error: message }, { status: 409 });
  }

  return NextResponse.json({ ok: true });
}
