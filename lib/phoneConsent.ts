import "server-only";

import { sql } from "@/lib/db";

export async function giveConsent(tripId: number, userId: number): Promise<void> {
  await sql`
    INSERT INTO trip_phone_consent (trip_id, user_id, created_at)
    VALUES (${tripId}, ${userId}, to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
    ON CONFLICT (trip_id, user_id) DO NOTHING
  `;
}

export async function hasConsented(tripId: number, userId: number): Promise<boolean> {
  const rows = await sql`
    SELECT 1 FROM trip_phone_consent WHERE trip_id = ${tripId} AND user_id = ${userId}
  `;

  return rows.length > 0;
}

export type RevealedPhone = {
  userId: number;
  name: string;
  phone: string;
};

// Номер телефона стороны раскрывается, только если обе стороны — и сам
// пользователь, и конкретный собеседник — по отдельности дали согласие.
export async function getRevealedPhones(
  tripId: number,
  userId: number
): Promise<RevealedPhone[]> {
  const myConsent = await hasConsented(tripId, userId);
  if (!myConsent) return [];

  const rows = await sql<{ id: number; name: string; phone: string | null }[]>`
    SELECT users.id as id, users.name as name, users.phone as phone
    FROM trip_phone_consent
    JOIN users ON users.id = trip_phone_consent.user_id
    WHERE trip_phone_consent.trip_id = ${tripId} AND trip_phone_consent.user_id != ${userId}
      AND users.phone IS NOT NULL
  `;

  return rows.map((r) => ({ userId: r.id, name: r.name, phone: r.phone as string }));
}
