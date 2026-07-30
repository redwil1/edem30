import { NextResponse } from "next/server";

import { getCarrierRide, getRideInterestedUsers, requireCarrierOperator } from "@/lib/carriers";

export const runtime = "nodejs";

type Props = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: Request, { params }: Props) {
  const operator = await requireCarrierOperator();
  if (!operator) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const { id } = await params;
  const rideId = Number(id);

  if (!Number.isInteger(rideId) || rideId <= 0) {
    return NextResponse.json({ error: "Некорректный рейс" }, { status: 400 });
  }

  const ride = await getCarrierRide(rideId);
  if (!ride || ride.carrierId !== operator.carrier.id) {
    return NextResponse.json({ error: "Рейс не найден" }, { status: 404 });
  }

  const passengers = await getRideInterestedUsers(rideId);

  return NextResponse.json({ passengers }, { headers: { "Cache-Control": "no-store" } });
}
