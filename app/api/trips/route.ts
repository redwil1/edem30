import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";
import { isTrustedOrigin } from "@/lib/security";
import { countActiveTripsByOwner, createTrip } from "@/lib/trips";
import { TripType } from "@/types/trips";

export const runtime = "nodejs";

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const MAX_ACTIVE_TRIPS = 3;

const TRANSPORT_CATEGORIES: Record<string, string> = {
  sedan: "Легковой автомобиль",
  minivan: "Минивэн",
  minibus: "Микроавтобус",
  cargo: "Грузовой автомобиль",
};

function isValidFutureDate(date: string) {
  const match = DATE_RE.exec(date);

  if (!match) return false;

  const parsed = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));

  if (Number.isNaN(parsed.getTime())) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return parsed.getTime() >= today.getTime();
}

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

  if (user.role !== "driver") {
    return NextResponse.json(
      { error: "Публиковать поездки могут только водители" },
      { status: 403 }
    );
  }

  const activeCount = await countActiveTripsByOwner(user.id);

  if (activeCount >= MAX_ACTIVE_TRIPS) {
    return NextResponse.json(
      {
        error: `Можно разместить не более ${MAX_ACTIVE_TRIPS} активных поездок одновременно. Дождитесь завершения одной из них или отмените её.`,
      },
      { status: 409 }
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
  const transportCategory =
    typeof body?.transportCategory === "string" ? body.transportCategory : "";

  const price = Number(body?.price);
  const totalSeats = Number(body?.totalSeats);

  if (!from || !to) {
    return NextResponse.json(
      { error: "Укажите откуда и куда едем" },
      { status: 400 }
    );
  }

  if (!isValidFutureDate(date)) {
    return NextResponse.json(
      { error: "Укажите корректную дату поездки" },
      { status: 400 }
    );
  }

  if (!TIME_RE.test(time)) {
    return NextResponse.json(
      { error: "Укажите корректное время (ЧЧ:ММ)" },
      { status: 400 }
    );
  }

  const transport = TRANSPORT_CATEGORIES[transportCategory];

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

  const id = await createTrip(
    { type, from, to, date, time, price, totalSeats, transport, transportCategory },
    { id: user.id, name: user.name }
  );

  return NextResponse.json({ id });
}
