import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";
import { isTrustedOrigin } from "@/lib/security";
import { createOrder, listOpenOrders } from "@/lib/taxiOrders";
import { getDriverEarnings } from "@/lib/trips";
import { isValidAddress } from "@/lib/addressValidation";
import { getSiteSettings } from "@/lib/siteSettings";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Войдите в аккаунт" }, { status: 401 });
  }

  const [orders, balance] = await Promise.all([
    listOpenOrders(user.id),
    getDriverEarnings(user.id),
  ]);

  return NextResponse.json(
    { orders, balance },
    { headers: { "Cache-Control": "no-store" } }
  );
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
      { error: "Войдите, чтобы заказать такси" },
      { status: 401 }
    );
  }

  const limit = rateLimit(`create-order:${user.id}`, {
    limit: 10,
    windowMs: 15 * 60_000,
  });

  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Слишком много заказов. Попробуйте позже." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);

  const from =
    typeof body?.from === "string" ? body.from.trim().slice(0, 120) : "";
  const to = typeof body?.to === "string" ? body.to.trim().slice(0, 120) : "";
  const city = typeof body?.city === "string" ? body.city.trim() : null;
  const price = Number(body?.price);
  const seats = Number(body?.seats);

  if (!from || !to) {
    return NextResponse.json(
      { error: "Укажите откуда и куда едем" },
      { status: 400 }
    );
  }

  if (!isValidAddress(from, city) || !isValidAddress(to, city)) {
    return NextResponse.json(
      { error: "Указывайте только реальные улицы из списка подсказок" },
      { status: 400 }
    );
  }

  const { min_taxi_price } = await getSiteSettings();
  const minPrice = Number(min_taxi_price) || 20;

  if (!Number.isInteger(price) || price < minPrice || price > 100_000) {
    return NextResponse.json(
      { error: `Минимальная цена поездки — ${minPrice} ₽` },
      { status: 400 }
    );
  }

  if (!Number.isInteger(seats) || seats <= 0 || seats > 8) {
    return NextResponse.json(
      { error: "Укажите количество пассажиров от 1 до 8" },
      { status: 400 }
    );
  }

  const id = await createOrder({ from, to, price, seats }, { id: user.id });

  return NextResponse.json({ id });
}
