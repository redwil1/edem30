import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";
import { isTrustedOrigin } from "@/lib/security";
import { cancelTrip } from "@/lib/trips";

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

  const limit = rateLimit(`trip-cancel:${user.id}`, { limit: 10, windowMs: 60_000 });

  if (!limit.allowed) {
    return NextResponse.json({ error: "Слишком много запросов" }, { status: 429 });
  }

  const { id } = await params;
  const tripId = Number(id);

  if (!Number.isInteger(tripId) || tripId <= 0) {
    return NextResponse.json({ error: "Некорректная поездка" }, { status: 400 });
  }

  const result = await cancelTrip(tripId, user.id);

  if (!result.ok) {
    const messages: Record<typeof result.reason, [string, number]> = {
      not_found: ["Поездка не найдена", 404],
      not_allowed: ["Только водитель может отменить поездку", 403],
      already_started: ["Поездку нельзя отменить — она уже началась", 409],
      already_done: ["Поездка уже отменена или завершена", 409],
    };

    const [error, status] = messages[result.reason];

    return NextResponse.json({ error }, { status });
  }

  return NextResponse.json({ ok: true });
}
