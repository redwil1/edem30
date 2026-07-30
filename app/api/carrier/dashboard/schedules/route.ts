import { NextRequest, NextResponse } from "next/server";

import { rateLimit } from "@/lib/rateLimit";
import { isTrustedOrigin } from "@/lib/security";
import { createSchedule, listVehicles, requireCarrierOperator } from "@/lib/carriers";

export const runtime = "nodejs";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const VALID_DAYS = new Set([1, 2, 3, 4, 5, 6, 7]);

export async function POST(req: NextRequest) {
  if (!isTrustedOrigin(req)) {
    return NextResponse.json({ error: "Недопустимый источник запроса" }, { status: 403 });
  }

  const operator = await requireCarrierOperator();
  if (!operator) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const limit = rateLimit(`carrier-schedule-create:${operator.userId}`, { limit: 30, windowMs: 60 * 60_000 });
  if (!limit.allowed) {
    return NextResponse.json({ error: "Слишком много запросов" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);

  const vehicleId = Number(body?.vehicleId);
  const fromCity = typeof body?.fromCity === "string" ? body.fromCity.trim().slice(0, 60) : "";
  const toCity = typeof body?.toCity === "string" ? body.toCity.trim().slice(0, 60) : "";
  const departureTime = typeof body?.departureTime === "string" ? body.departureTime.trim() : "";
  const daysOfWeek = Array.isArray(body?.daysOfWeek)
    ? body.daysOfWeek.map((d: unknown) => Number(d)).filter((d: number) => VALID_DAYS.has(d))
    : [];
  const price = Number(body?.price);

  if (!fromCity || !toCity) {
    return NextResponse.json({ error: "Укажите маршрут" }, { status: 400 });
  }

  if (!TIME_RE.test(departureTime)) {
    return NextResponse.json({ error: "Укажите время отправления" }, { status: 400 });
  }

  if (daysOfWeek.length === 0) {
    return NextResponse.json({ error: "Выберите дни недели" }, { status: 400 });
  }

  if (!Number.isInteger(price) || price <= 0 || price > 100_000) {
    return NextResponse.json({ error: "Укажите цену" }, { status: 400 });
  }

  const vehicles = await listVehicles(operator.carrier.id, true);
  if (!vehicles.some((v) => v.id === vehicleId)) {
    return NextResponse.json({ error: "Выберите машину" }, { status: 400 });
  }

  const id = await createSchedule(operator.carrier.id, {
    vehicleId,
    fromCity,
    toCity,
    departureTime,
    daysOfWeek: daysOfWeek.join(","),
    price,
  });

  return NextResponse.json({ id });
}
