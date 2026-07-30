import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";
import { isTrustedOrigin } from "@/lib/security";
import { registerRideInterest } from "@/lib/carriers";

export const runtime = "nodejs";

type Props = {
  params: Promise<{ id: string }>;
};

export async function POST(req: NextRequest, { params }: Props) {
  if (!isTrustedOrigin(req)) {
    return NextResponse.json({ error: "Недопустимый источник запроса" }, { status: 403 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Войдите, чтобы оставить заявку" }, { status: 401 });
  }

  const limit = rateLimit(`carrier-interest:${user.id}`, { limit: 20, windowMs: 60 * 60_000 });
  if (!limit.allowed) {
    return NextResponse.json({ error: "Слишком много запросов. Попробуйте позже." }, { status: 429 });
  }

  const { id } = await params;
  const rideId = Number(id);

  if (!Number.isInteger(rideId) || rideId <= 0) {
    return NextResponse.json({ error: "Некорректный рейс" }, { status: 400 });
  }

  const result = await registerRideInterest(rideId, user.id);

  if (!result.ok) {
    return NextResponse.json({ error: "Рейс не найден" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, alreadyExists: result.alreadyExists });
}
