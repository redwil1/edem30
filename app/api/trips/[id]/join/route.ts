import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";
import { isTrustedOrigin } from "@/lib/security";
import { getTripById } from "@/lib/trips";

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

  if (!getTripById(tripId)) {
    return NextResponse.json({ error: "Поездка не найдена" }, { status: 404 });
  }

  db.prepare(
    "INSERT OR IGNORE INTO trip_participants (trip_id, user_id) VALUES (?, ?)"
  ).run(tripId, user.id);

  return NextResponse.json({ ok: true });
}
