import { NextRequest, NextResponse } from "next/server";

import { rateLimit } from "@/lib/rateLimit";
import { isTrustedOrigin } from "@/lib/security";
import { createVehicle, requireCarrierOperator } from "@/lib/carriers";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!isTrustedOrigin(req)) {
    return NextResponse.json({ error: "Недопустимый источник запроса" }, { status: 403 });
  }

  const operator = await requireCarrierOperator();
  if (!operator) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const limit = rateLimit(`carrier-vehicle-create:${operator.userId}`, { limit: 20, windowMs: 60 * 60_000 });
  if (!limit.allowed) {
    return NextResponse.json({ error: "Слишком много запросов" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);

  const label = typeof body?.label === "string" ? body.label.trim().slice(0, 60) : "";
  const make = typeof body?.make === "string" ? body.make.trim().slice(0, 40) : "";
  const model = typeof body?.model === "string" ? body.model.trim().slice(0, 40) : "";
  const plate = typeof body?.plate === "string" ? body.plate.trim().slice(0, 20) : "";
  const showPlate = body?.showPlate === true;
  const seats = Number(body?.seats);

  if (!label) {
    return NextResponse.json({ error: "Укажите название машины" }, { status: 400 });
  }

  if (!Number.isInteger(seats) || seats <= 0 || seats > 50) {
    return NextResponse.json({ error: "Укажите количество мест" }, { status: 400 });
  }

  const id = await createVehicle(operator.carrier.id, {
    label,
    make: make || undefined,
    model: model || undefined,
    plate: plate || undefined,
    showPlate,
    seats,
  });

  return NextResponse.json({ id });
}
