import { NextResponse } from "next/server";

import { sql } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

type Props = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: Request, { params }: Props) {
  const { id } = await params;
  const tripId = Number(id);

  if (!Number.isInteger(tripId) || tripId <= 0) {
    return NextResponse.json({ error: "Некорректная поездка" }, { status: 400 });
  }

  const rows = await sql<{ id: number; name: string }[]>`
    SELECT users.id as id, users.name as name
    FROM trip_participants
    JOIN users ON users.id = trip_participants.user_id
    WHERE trip_participants.trip_id = ${tripId}
    ORDER BY trip_participants.joined_at ASC
  `;

  const user = await getCurrentUser();

  const joined = !!user && rows.some((r) => r.id === user.id);

  return NextResponse.json({
    participants: rows.map((r) => ({
      id: r.id,
      name: r.name,
      isYou: user ? r.id === user.id : false,
    })),
    joined,
  });
}
