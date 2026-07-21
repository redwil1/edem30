import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";
import { isTrustedOrigin } from "@/lib/security";
import { createTrip } from "@/lib/trips";
import { TripType } from "@/types/trips";

export const runtime = "nodejs";

const ALLOWED_DATES = ["Сегодня", "Завтра", "Послезавтра"];
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export async function POST(req: NextRequest) {
  if (!isTrustedOrigin(req)) {
    return NextResponse.json(
      { error: "Недопустимый источник запроса" },
      { status: 403 }
    );
  }

  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: "Войдите, чтобы опубликовать поездку" },
      { status: 401 }
    );
  }

  const limit = rateLimit(`create-trip:${user.id}`, {
    limit: 10,
    windowMs: 60 * 60_000,
  });

  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Слишком много поездок опубликовано. Попробуйте позже." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);

  const type: TripType = body?.type === "city" ? "city" : "intercity";

  const from =
    typeof body?.from === "string" ? body.from.trim().slice(0, 60) : "";
  const to = typeof body?.to === "string" ? body.to.trim().slice(0, 60) : "";
  const date = typeof body?.date === "string" ? body.date.trim() : "";
  const time = typeof body?.time === "string" ? body.time.trim() : "";
  const transport =
    typeof body?.transport === "string"
      ? body.transport.trim().slice(0, 40)
      : "";

  const price = Number(body?.price);
  const totalSeats = Number(body?.totalSeats);

  if (!from || !to) {
    return NextResponse.json(
      { error: "Укажите откуда и куда едем" },
      { status: 400 }
    );
  }

  if (!ALLOWED_DATES.includes(date)) {
    return NextResponse.json({ error: "Укажите дату поездки" }, { status: 400 });
  }

  if (!TIME_RE.test(time)) {
    return NextResponse.json(
      { error: "Укажите корректное время (ЧЧ:ММ)" },
      { status: 400 }
    );
  }

  if (!transport) {
    return NextResponse.json(
      { error: "Укажите тип транспорта" },
      { status: 400 }
    );
  }

  if (!Number.isInteger(price) || price <= 0 || price > 100_000) {
    return NextResponse.json(
      { error: "Укажите корректную цену" },
      { status: 400 }
    );
  }

  if (!Number.isInteger(totalSeats) || totalSeats <= 0 || totalSeats > 8) {
    return NextResponse.json(
      { error: "Укажите количество мест от 1 до 8" },
      { status: 400 }
    );
  }

  const id = createTrip(
    { type, from, to, date, time, price, totalSeats, transport },
    { id: user.id, name: user.name }
  );

  return NextResponse.json({ id });
}
