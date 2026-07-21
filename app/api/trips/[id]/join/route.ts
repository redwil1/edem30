import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";
import { isTrustedOrigin } from "@/lib/security";
import { joinTrip } from "@/lib/trips";

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
    return NextResponse.json(
      { error: "Войдите, чтобы присоединиться к поездке" },
      { status: 401 }
    );
  }

  const limit = rateLimit(`join:${user.id}`, { limit: 30, windowMs: 60_000 });

  if (!limit.allowed) {
    return NextResponse.json({ error: "Слишком много запросов" }, { status: 429 });
  }

  const { id } = await params;
  const tripId = Number(id);

  if (!Number.isInteger(tripId) || tripId <= 0) {
    return NextResponse.json({ error: "Некорректная поездка" }, { status: 400 });
  }

  const result = await joinTrip(tripId, user.id);

  if (!result.ok) {
    const messages: Record<typeof result.reason, string> = {
      not_found: "Поездка не найдена",
      cancelled: "Поездка отменена водителем",
      completed: "Поездка уже завершена",
      self: "Вы не можете присоединиться к собственной поездке",
      full: "Свободных мест больше нет",
    };

    const status = result.reason === "not_found" ? 404 : 409;

    return NextResponse.json({ error: messages[result.reason] }, { status });
  }

  return NextResponse.json({ ok: true });
}
