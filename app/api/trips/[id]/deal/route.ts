import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";
import { isTrustedOrigin } from "@/lib/security";
import {
  getTripDeal,
  getTripOwnerId,
  isTripParticipant,
  submitDeal,
} from "@/lib/trips";

export const runtime = "nodejs";

type Props = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: Request, { params }: Props) {
  const { id } = await params;
  const tripId = Number(id);

  if (!Number.isInteger(tripId) || tripId <= 0) {
    return NextResponse.json({ error: "Некорректная поездка" }, { status: 400 });
  }

  const user = await getCurrentUser();
  const deal = await getTripDeal(tripId);

  const isDriver = !!user && (await getTripOwnerId(tripId)) === user.id;
  const isPassenger = !!user && (await isTripParticipant(tripId, user.id));

  return NextResponse.json(
    { ...deal, isDriver, isPassenger },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(req: NextRequest, { params }: Props) {
  if (!isTrustedOrigin(req)) {
    return NextResponse.json(
      { error: "Недопустимый источник запроса" },
      { status: 403 }
    );
  }

  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Войдите в аккаунт" }, { status: 401 });
  }

  const limit = rateLimit(`deal:${user.id}`, { limit: 30, windowMs: 60_000 });

  if (!limit.allowed) {
    return NextResponse.json({ error: "Слишком много запросов" }, { status: 429 });
  }

  const { id } = await params;
  const tripId = Number(id);

  if (!Number.isInteger(tripId) || tripId <= 0) {
    return NextResponse.json({ error: "Некорректная поездка" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const price = Number(body?.price);

  if (!Number.isInteger(price) || price <= 0 || price > 100_000) {
    return NextResponse.json({ error: "Укажите корректную цену" }, { status: 400 });
  }

  const result = await submitDeal(tripId, user.id, price);

  if (!result.ok) {
    if (result.reason === "not_found") {
      return NextResponse.json({ error: "Поездка не найдена" }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Вы не участник этой поездки" },
      { status: 403 }
    );
  }

  return NextResponse.json(result.deal);
}
