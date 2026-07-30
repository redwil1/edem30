import { NextRequest, NextResponse } from "next/server";

import { isTrustedOrigin } from "@/lib/security";
import { requireCarrierOperator, setVehicleActive } from "@/lib/carriers";

export const runtime = "nodejs";

type Props = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: NextRequest, { params }: Props) {
  if (!isTrustedOrigin(req)) {
    return NextResponse.json({ error: "Недопустимый источник запроса" }, { status: 403 });
  }

  const operator = await requireCarrierOperator();
  if (!operator) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const { id } = await params;
  const vehicleId = Number(id);

  if (!Number.isInteger(vehicleId) || vehicleId <= 0) {
    return NextResponse.json({ error: "Некорректная машина" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  if (typeof body?.active !== "boolean") {
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  }

  await setVehicleActive(operator.carrier.id, vehicleId, body.active);

  return NextResponse.json({ ok: true });
}
