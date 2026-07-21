import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { isTrustedOrigin } from "@/lib/security";
import {
  confirmTripStart,
  getTripLifecycle,
  getTripOwnerId,
  isTripParticipant,
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
  const status = getTripLifecycle(tripId);

  const isDriver = !!user && getTripOwnerId(tripId) === user.id;
  const isPassenger = !!user && isTripParticipant(tripId, user.id);

  return NextResponse.json(
    { ...status, isDriver, isPassenger },
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

  const { id } = await params;
  const tripId = Number(id);

  if (!Number.isInteger(tripId) || tripId <= 0) {
    return NextResponse.json({ error: "Некорректная поездка" }, { status: 400 });
  }

  const result = confirmTripStart(tripId, user.id);

  if (!result.ok) {
    if (result.reason === "not_found") {
      return NextResponse.json({ error: "Поездка не найдена" }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Вы не участник этой поездки" },
      { status: 403 }
    );
  }

  return NextResponse.json(result.status);
}
