import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { closeRideRequest } from "@/lib/rideRequests";
import { isTrustedOrigin } from "@/lib/security";

export const runtime = "nodejs";

type Props = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Props) {
  if (!isTrustedOrigin(req)) {
    return NextResponse.json({ error: "Недопустимый источник запроса" }, { status: 403 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Войдите в аккаунт" }, { status: 401 });
  }

  const { id } = await params;
  const requestId = Number(id);
  if (!Number.isInteger(requestId) || requestId <= 0) {
    return NextResponse.json({ error: "Некорректная заявка" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const acceptedDriverId =
    typeof body?.driverId === "number" && Number.isInteger(body.driverId) ? body.driverId : undefined;

  const result = await closeRideRequest(requestId, user.id, acceptedDriverId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
