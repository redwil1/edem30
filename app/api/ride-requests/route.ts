import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { createRideRequest, listOpenRideRequests } from "@/lib/rideRequests";
import { rateLimit } from "@/lib/rateLimit";
import { isTrustedOrigin } from "@/lib/security";

export const runtime = "nodejs";

export async function GET() {
  const requests = await listOpenRideRequests();
  return NextResponse.json(
    { requests },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(req: NextRequest) {
  if (!isTrustedOrigin(req)) {
    return NextResponse.json({ error: "Недопустимый источник запроса" }, { status: 403 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Войдите, чтобы создать заявку" }, { status: 401 });
  }

  const limit = rateLimit(`ride-request-create:${user.id}`, { limit: 10, windowMs: 60 * 60_000 });
  if (!limit.allowed) {
    return NextResponse.json({ error: "Слишком много заявок. Попробуйте позже." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);

  const from = typeof body?.from === "string" ? body.from.trim() : "";
  const to = typeof body?.to === "string" ? body.to.trim() : "";
  const date = typeof body?.date === "string" ? body.date.trim() : "";
  const time = typeof body?.time === "string" ? body.time.trim() : "";
  const passengersCount = Number(body?.passengersCount ?? 1);
  const comment = typeof body?.comment === "string" ? body.comment.trim().slice(0, 500) : "";

  if (!from || !to) {
    return NextResponse.json({ error: "Укажите откуда и куда" }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Укажите дату" }, { status: 400 });
  }
  if (!/^\d{2}:\d{2}$/.test(time)) {
    return NextResponse.json({ error: "Укажите время" }, { status: 400 });
  }
  if (!Number.isInteger(passengersCount) || passengersCount < 1 || passengersCount > 8) {
    return NextResponse.json({ error: "Некорректное количество пассажиров" }, { status: 400 });
  }

  const id = await createRideRequest(user.id, {
    from,
    to,
    date,
    time,
    passengersCount,
    comment: comment || undefined,
  });

  return NextResponse.json({ id });
}
