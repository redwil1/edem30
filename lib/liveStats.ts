import "server-only";

import { sql } from "@/lib/db";

export const ACTIVE_TRIP_CLAUSE = sql`
  cancelled_at IS NULL
  AND NOT (driver_completed_at IS NOT NULL AND passenger_completed_at IS NOT NULL)
`;

export type LiveStats = {
  driversOnline: number;
  passengersRiding: number;
  tripsToday: number;
  lastBookingAt: string | null;
};

export async function getLiveStats(): Promise<LiveStats> {
  const [drivers, riding, today, lastBooking] = await Promise.all([
    sql<{ c: string }[]>`
      SELECT COUNT(DISTINCT owner_id) as c FROM trips WHERE ${ACTIVE_TRIP_CLAUSE}
    `,
    sql<{ c: string }[]>`
      SELECT COUNT(DISTINCT trip_participants.user_id) as c
      FROM trip_participants
      JOIN trips ON trips.id = trip_participants.trip_id
      WHERE trips.driver_confirmed_at IS NOT NULL
        AND trips.passenger_confirmed_at IS NOT NULL
        AND NOT (trips.driver_completed_at IS NOT NULL AND trips.passenger_completed_at IS NOT NULL)
    `,
    sql<{ c: string }[]>`
      SELECT COUNT(*) as c FROM trips
      WHERE trip_date = to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD')
    `,
    sql<{ joined_at: string | null }[]>`
      SELECT MAX(joined_at) as joined_at FROM trip_participants
    `,
  ]);

  return {
    driversOnline: Number(drivers[0].c),
    passengersRiding: Number(riding[0].c),
    tripsToday: Number(today[0].c),
    lastBookingAt: lastBooking[0]?.joined_at ?? null,
  };
}

export type ActivityItem = {
  id: string;
  tripId: number;
  kind: "joined" | "created" | "started";
  name: string;
  routeLabel: string;
  at: string;
};

type EventRow = {
  id: number;
  name: string;
  from_city: string;
  to_city: string;
  at: string | null;
};

export async function getRecentActivity(limit = 8): Promise<ActivityItem[]> {
  const [joins, creations, starts] = await Promise.all([
    sql<EventRow[]>`
      SELECT trip_participants.trip_id as id, users.name as name,
             trips.from_city as from_city, trips.to_city as to_city,
             trip_participants.joined_at as at
      FROM trip_participants
      JOIN users ON users.id = trip_participants.user_id
      JOIN trips ON trips.id = trip_participants.trip_id
      ORDER BY trip_participants.joined_at DESC
      LIMIT ${limit}
    `,
    sql<EventRow[]>`
      SELECT id, driver_name as name, from_city, to_city, created_at as at
      FROM trips
      ORDER BY created_at DESC
      LIMIT ${limit}
    `,
    sql<EventRow[]>`
      SELECT id, driver_name as name, from_city, to_city,
             GREATEST(driver_confirmed_at, passenger_confirmed_at) as at
      FROM trips
      WHERE driver_confirmed_at IS NOT NULL AND passenger_confirmed_at IS NOT NULL
      ORDER BY at DESC
      LIMIT ${limit}
    `,
  ]);

  const merged: ActivityItem[] = [
    ...joins.map((r) => ({
      id: `joined-${r.id}-${r.name}-${r.at}`,
      tripId: r.id,
      kind: "joined" as const,
      name: r.name,
      routeLabel: `${r.from_city} → ${r.to_city}`,
      at: r.at ?? "",
    })),
    ...creations.map((r) => ({
      id: `created-${r.id}`,
      tripId: r.id,
      kind: "created" as const,
      name: r.name,
      routeLabel: `${r.from_city} → ${r.to_city}`,
      at: r.at ?? "",
    })),
    ...starts.map((r) => ({
      id: `started-${r.id}`,
      tripId: r.id,
      kind: "started" as const,
      name: r.name,
      routeLabel: `${r.from_city} → ${r.to_city}`,
      at: r.at ?? "",
    })),
  ].filter((item) => item.at);

  merged.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return merged.slice(0, limit);
}

export type ActivityWindow = {
  bookedSeats: number;
  newTrips: number;
};

export async function getActivityWindow(minutes = 10): Promise<ActivityWindow> {
  const since = new Date(Date.now() - minutes * 60_000).toISOString();

  const [booked, created] = await Promise.all([
    sql<{ c: string }[]>`
      SELECT COUNT(*) as c FROM trip_participants WHERE joined_at >= ${since}
    `,
    sql<{ c: string }[]>`
      SELECT COUNT(*) as c FROM trips WHERE created_at >= ${since}
    `,
  ]);

  return {
    bookedSeats: Number(booked[0].c),
    newTrips: Number(created[0].c),
  };
}
