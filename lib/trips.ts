import "server-only";

import { db } from "@/lib/db";
import { Trip, TripType } from "@/types/trips";

type TripRow = {
  id: number;
  type: TripType;
  from_city: string;
  to_city: string;
  trip_date: string;
  trip_time: string;
  price: number;
  total_seats: number;
  transport: string;
  driver_name: string;
  owner_id: number | null;
  verified: number;
  taken_seats: number;
  owner_rating: number | null;
  owner_reviews_count: number | null;
};

const SELECT_BASE = `
  SELECT
    trips.*,
    (SELECT COUNT(*) FROM trip_participants WHERE trip_participants.trip_id = trips.id) as taken_seats,
    (SELECT AVG(rating) FROM reviews WHERE reviews.reviewee_id = trips.owner_id) as owner_rating,
    (SELECT COUNT(*) FROM reviews WHERE reviews.reviewee_id = trips.owner_id) as owner_reviews_count
  FROM trips
`;

function toTrip(row: TripRow): Trip {
  return {
    id: row.id,
    type: row.type,
    from: row.from_city,
    to: row.to_city,
    date: row.trip_date,
    time: row.trip_time,
    price: row.price,
    totalSeats: row.total_seats,
    seats: Math.max(row.total_seats - row.taken_seats, 0),
    transport: row.transport,
    driver: row.driver_name,
    rating: row.owner_rating ? Math.round(row.owner_rating * 10) / 10 : 0,
    tripsCount: row.owner_reviews_count ?? 0,
    verified: !!row.verified,
  };
}

export function listTrips(type?: TripType): Trip[] {
  const rows = type
    ? (db
        .prepare(`${SELECT_BASE} WHERE trips.type = ? ORDER BY trips.id DESC`)
        .all(type) as TripRow[])
    : (db.prepare(`${SELECT_BASE} ORDER BY trips.id DESC`).all() as TripRow[]);

  return rows.map(toTrip);
}

export function getTripById(id: number): Trip | undefined {
  if (!Number.isInteger(id) || id <= 0) return undefined;

  const row = db
    .prepare(`${SELECT_BASE} WHERE trips.id = ?`)
    .get(id) as TripRow | undefined;

  return row ? toTrip(row) : undefined;
}

export function getTripOwnerId(id: number): number | null {
  const row = db
    .prepare("SELECT owner_id FROM trips WHERE id = ?")
    .get(id) as { owner_id: number | null } | undefined;

  return row?.owner_id ?? null;
}

export function isTripParticipant(tripId: number, userId: number): boolean {
  const row = db
    .prepare(
      "SELECT 1 FROM trip_participants WHERE trip_id = ? AND user_id = ?"
    )
    .get(tripId, userId);

  return !!row;
}

export function leaveTrip(tripId: number, userId: number): void {
  db.prepare(
    "DELETE FROM trip_participants WHERE trip_id = ? AND user_id = ?"
  ).run(tripId, userId);
}

type LifecycleRow = {
  driver_confirmed_at: string | null;
  passenger_confirmed_at: string | null;
  driver_completed_at: string | null;
  passenger_completed_at: string | null;
};

export type TripLifecycle = {
  driverConfirmed: boolean;
  passengerConfirmed: boolean;
  started: boolean;
  startedAt: string | null;
  driverCompleted: boolean;
  passengerCompleted: boolean;
  completed: boolean;
  completedAt: string | null;
};

export function getTripLifecycle(tripId: number): TripLifecycle {
  const row = db
    .prepare(
      `SELECT driver_confirmed_at, passenger_confirmed_at,
              driver_completed_at, passenger_completed_at
       FROM trips WHERE id = ?`
    )
    .get(tripId) as LifecycleRow | undefined;

  const driverConfirmed = !!row?.driver_confirmed_at;
  const passengerConfirmed = !!row?.passenger_confirmed_at;
  const started = driverConfirmed && passengerConfirmed;

  const startedAt =
    started && row
      ? [row.driver_confirmed_at, row.passenger_confirmed_at].sort().pop() ?? null
      : null;

  const driverCompleted = !!row?.driver_completed_at;
  const passengerCompleted = !!row?.passenger_completed_at;
  const completed = driverCompleted && passengerCompleted;

  const completedAt =
    completed && row
      ? [row.driver_completed_at, row.passenger_completed_at].sort().pop() ?? null
      : null;

  return {
    driverConfirmed,
    passengerConfirmed,
    started,
    startedAt,
    driverCompleted,
    passengerCompleted,
    completed,
    completedAt,
  };
}

export type ConfirmResult =
  | { ok: true; status: TripLifecycle }
  | { ok: false; reason: "not_found" | "not_allowed" | "not_started" };

export function confirmTripStart(tripId: number, userId: number): ConfirmResult {
  const trip = db
    .prepare("SELECT owner_id FROM trips WHERE id = ?")
    .get(tripId) as { owner_id: number | null } | undefined;

  if (!trip) return { ok: false, reason: "not_found" };

  const isDriver = trip.owner_id === userId;
  const isPassenger = isTripParticipant(tripId, userId);

  if (!isDriver && !isPassenger) {
    return { ok: false, reason: "not_allowed" };
  }

  if (isDriver) {
    db.prepare(
      "UPDATE trips SET driver_confirmed_at = COALESCE(driver_confirmed_at, datetime('now')) WHERE id = ?"
    ).run(tripId);
  }

  if (isPassenger) {
    db.prepare(
      "UPDATE trips SET passenger_confirmed_at = COALESCE(passenger_confirmed_at, datetime('now')) WHERE id = ?"
    ).run(tripId);
  }

  return { ok: true, status: getTripLifecycle(tripId) };
}

export function confirmTripComplete(
  tripId: number,
  userId: number
): ConfirmResult {
  const trip = db
    .prepare("SELECT owner_id FROM trips WHERE id = ?")
    .get(tripId) as { owner_id: number | null } | undefined;

  if (!trip) return { ok: false, reason: "not_found" };

  const isDriver = trip.owner_id === userId;
  const isPassenger = isTripParticipant(tripId, userId);

  if (!isDriver && !isPassenger) {
    return { ok: false, reason: "not_allowed" };
  }

  if (!getTripLifecycle(tripId).started) {
    return { ok: false, reason: "not_started" };
  }

  if (isDriver) {
    db.prepare(
      "UPDATE trips SET driver_completed_at = COALESCE(driver_completed_at, datetime('now')) WHERE id = ?"
    ).run(tripId);
  }

  if (isPassenger) {
    db.prepare(
      "UPDATE trips SET passenger_completed_at = COALESCE(passenger_completed_at, datetime('now')) WHERE id = ?"
    ).run(tripId);
  }

  return { ok: true, status: getTripLifecycle(tripId) };
}

const COMPLETED_CLAUSE =
  "driver_completed_at IS NOT NULL AND passenger_completed_at IS NOT NULL";

export function countTripsAsDriver(userId: number): number {
  const row = db
    .prepare(
      `SELECT COUNT(*) as count FROM trips WHERE owner_id = ? AND ${COMPLETED_CLAUSE}`
    )
    .get(userId) as { count: number };

  return row.count;
}

export function countTripsAsPassenger(userId: number): number {
  const row = db
    .prepare(
      `SELECT COUNT(*) as count
       FROM trip_participants
       JOIN trips ON trips.id = trip_participants.trip_id
       WHERE trip_participants.user_id = ? AND trips.${COMPLETED_CLAUSE}`
    )
    .get(userId) as { count: number };

  return row.count;
}

export function getDriverEarnings(userId: number): number {
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(trips.price * (
         SELECT COUNT(*) FROM trip_participants WHERE trip_participants.trip_id = trips.id
       )), 0) as total
       FROM trips
       WHERE trips.owner_id = ? AND trips.${COMPLETED_CLAUSE}`
    )
    .get(userId) as { total: number };

  return row.total;
}

export type CreateTripInput = {
  type: TripType;
  from: string;
  to: string;
  date: string;
  time: string;
  price: number;
  totalSeats: number;
  transport: string;
};

export function createTrip(
  input: CreateTripInput,
  owner: { id: number; name: string }
): number {
  const result = db
    .prepare(
      `INSERT INTO trips
        (type, from_city, to_city, trip_date, trip_time, price, total_seats, transport, driver_name, owner_id, verified)
       VALUES (@type, @from, @to, @date, @time, @price, @totalSeats, @transport, @driver, @ownerId, 0)`
    )
    .run({
      type: input.type,
      from: input.from,
      to: input.to,
      date: input.date,
      time: input.time,
      price: input.price,
      totalSeats: input.totalSeats,
      transport: input.transport,
      driver: owner.name,
      ownerId: owner.id,
    });

  return Number(result.lastInsertRowid);
}
