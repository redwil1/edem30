import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";
import { isTrustedOrigin } from "@/lib/security";
import { confirmDriverArrival, getTripNotifyInfo, getTripStartDetail } from "@/lib/trips";
import { notifyUserWithEmailFallback } from "@/lib/push";

export const runtime = "nodejs";

type Props = {
  params: Promise<{ id: string }>;
};

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

  const limit = rateLimit(`trip-arrive:${user.id}`, { limit: 20, windowMs: 60_000 });

  if (!limit.allowed) {
    return NextResponse.json({ error: "Слишком много запросов" }, { status: 429 });
  }

  const { id } = await params;
  const tripId = Number(id);

  if (!Number.isInteger(tripId) || tripId <= 0) {
    return NextResponse.json({ error: "Некорректная поездка" }, { status: 400 });
  }

  const result = await confirmDriverArrival(tripId, user.id);

  if (!result.ok) {
    if (result.reason === "not_found") {
      return NextResponse.json({ error: "Поездка не найдена" }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Только водитель может подтвердить прибытие" },
      { status: 403 }
    );
  }

  const info = await getTripNotifyInfo(tripId);
  if (info) {
    const route = `${info.from} → ${info.to}`;
    for (const passengerId of info.participantIds) {
      notifyUserWithEmailFallback(passengerId, {
        title: "Водитель на месте",
        body: route,
        url: `/trip/${tripId}`,
      });
    }
  }

  return NextResponse.json(await getTripStartDetail(tripId, user.id));
}
