import { NextResponse } from "next/server";

import { getCarrierRide, getRideInterestedUsers, listBookingsForRide, requireCarrierOperator } from "@/lib/carriers";

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

  const [bookings, interests] = await Promise.all([
    listBookingsForRide(rideId),
    getRideInterestedUsers(rideId),
  ]);

  return NextResponse.json(
    {
      bookings: bookings
        .filter((b) => b.status === "active")
        .map((b) => ({
          id: b.id,
          seats: b.seats,
          passengerName: b.passengerName,
          passengerPhone: b.passengerPhone,
          pickup: b.pickup,
          dropoff: b.dropoff,
          comment: b.comment,
          source: b.source,
          userId: b.userId,
        })),
      interests,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
