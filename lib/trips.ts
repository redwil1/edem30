import "server-only";

import type postgres from "postgres";

import { sql } from "@/lib/db";
import { hasReviewed } from "@/lib/reviews";
import { Trip, TripType } from "@/types/trips";

const NOW = `to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`;

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
  taken_seats: string;
  owner_rating: number | null;
  owner_reviews_count: string | null;
  car_model: string | null;
  license_plate: string | null;
  owner_avatar_url: string | null;
  owner_avatar_preset: string | null;
};

function toTrip(row: TripRow): Trip {
  const takenSeats = Number(row.taken_seats);

  return {
    id: row.id,
    type: row.type,
    from: row.from_city,
    to: row.to_city,
    date: row.trip_date,
    time: row.trip_time,
    price: row.price,
    totalSeats: row.total_seats,
    seats: Math.max(row.total_seats - takenSeats, 0),
    transport: row.transport,
    driver: row.driver_name,
    driverId: row.owner_id,
    rating: row.owner_rating ? Math.round(row.owner_rating * 10) / 10 : 0,
    tripsCount: row.owner_reviews_count ? Number(row.owner_reviews_count) : 0,
    verified: !!row.verified,
    carModel: row.car_model,
    licensePlate: row.license_plate,
    driverAvatarUrl: row.owner_avatar_url,
    driverAvatarPreset: row.owner_avatar_preset,
  };
}

const TRIP_SELECT = sql`
  trips.*,
  (SELECT COUNT(*) FROM trip_participants WHERE trip_participants.trip_id = trips.id) as taken_seats,
  (SELECT AVG(rating) FROM reviews WHERE reviews.reviewee_id = trips.owner_id) as owner_rating,
  (SELECT COUNT(*) FROM reviews WHERE reviews.reviewee_id = trips.owner_id) as owner_reviews_count,
  (SELECT avatar_url FROM users WHERE users.id = trips.owner_id) as owner_avatar_url,
  (SELECT avatar_preset FROM users WHERE users.id = trips.owner_id) as owner_avatar_preset
`;

const ACTIVE_CLAUSE = sql`
  trips.cancelled_at IS NULL
  AND NOT (trips.driver_completed_at IS NOT NULL AND trips.passenger_completed_at IS NOT NULL)
`;

export async function listTrips(type?: TripType): Promise<Trip[]> {
  await autoCancelEmptyIntercityTrips();

  const rows = await sql<TripRow[]>`
    SELECT ${TRIP_SELECT}
    FROM trips
    WHERE ${ACTIVE_CLAUSE}
    ${type ? sql`AND trips.type = ${type}` : sql``}
    ORDER BY trips.id DESC
  `;

  return rows.map(toTrip);
}

type OwnedTripRow = TripRow & {
  cancelled_at: string | null;
  driver_completed_at: string | null;
  passenger_completed_at: string | null;
};

export type OwnedTrip = Trip & {
  cancelled: boolean;
  completed: boolean;
};

export async function listTripsByOwner(ownerId: number): Promise<OwnedTrip[]> {
  const rows = await sql<OwnedTripRow[]>`
    SELECT ${TRIP_SELECT}
    FROM trips
    WHERE trips.owner_id = ${ownerId}
    ORDER BY trips.id DESC
  `;

  return rows.map((row) => ({
    ...toTrip(row),
    cancelled: !!row.cancelled_at,
    completed: !!row.driver_completed_at && !!row.passenger_completed_at,
  }));
}

export async function getTripById(id: number): Promise<Trip | undefined> {
  if (!Number.isInteger(id) || id <= 0) return undefined;

  const rows = await sql<TripRow[]>`
    SELECT ${TRIP_SELECT} FROM trips WHERE trips.id = ${id}
  `;

  return rows[0] ? toTrip(rows[0]) : undefined;
}

export async function getTripOwnerId(id: number): Promise<number | null> {
  const rows = await sql<{ owner_id: number | null }[]>`
    SELECT owner_id FROM trips WHERE id = ${id}
  `;

  return rows[0]?.owner_id ?? null;
}

export async function isTripParticipant(
  tripId: number,
  userId: number
): Promise<boolean> {
  const rows = await sql`
    SELECT 1 FROM trip_participants WHERE trip_id = ${tripId} AND user_id = ${userId}
  `;

  return rows.length > 0;
}

export const CHAT_LOCK_GRACE_MS = 60_000;

export function isChatLocked(completedAt: string | null): boolean {
  if (!completedAt) return false;

  return Date.now() - new Date(completedAt).getTime() > CHAT_LOCK_GRACE_MS;
}

export async function isTripPartyMember(
  tripId: number,
  userId: number
): Promise<boolean> {
  const [owner, participant] = await Promise.all([
    getTripOwnerId(tripId),
    isTripParticipant(tripId, userId),
  ]);

  return owner === userId || participant;
}

export async function isInstantTaxiTrip(tripId: number): Promise<boolean> {
  const rows = await sql`SELECT 1 FROM taxi_orders WHERE trip_id = ${tripId}`;

  return rows.length > 0;
}

const MAX_LEAVES_PER_TRIP = 3;

export async function leaveTrip(tripId: number, userId: number): Promise<void> {
  await sql.begin(async (tx) => {
    const deleted = await tx`
      DELETE FROM trip_participants WHERE trip_id = ${tripId} AND user_id = ${userId}
    `;

    if (deleted.count > 0) {
      await tx`INSERT INTO trip_leave_log (trip_id, user_id) VALUES (${tripId}, ${userId})`;
    }
  });
}

async function leaveCount(tripId: number, userId: number): Promise<number> {
  const rows = await sql<{ count: string }[]>`
    SELECT COUNT(*) as count FROM trip_leave_log WHERE trip_id = ${tripId} AND user_id = ${userId}
  `;

  return Number(rows[0].count);
}

export type JoinResult =
  | { ok: true }
  | {
      ok: false;
      reason:
        | "not_found"
        | "cancelled"
        | "completed"
        | "self"
        | "full"
        | "too_many_cancellations";
    };

export async function joinTrip(tripId: number, userId: number): Promise<JoinResult> {
  const rows = await sql<
    {
      owner_id: number | null;
      total_seats: number;
      cancelled_at: string | null;
      driver_completed_at: string | null;
      passenger_completed_at: string | null;
      taken_seats: string;
    }[]
  >`
    SELECT owner_id, total_seats, cancelled_at, driver_completed_at, passenger_completed_at,
           (SELECT COUNT(*) FROM trip_participants WHERE trip_participants.trip_id = trips.id) as taken_seats
    FROM trips WHERE id = ${tripId}
  `;

  const trip = rows[0];

  if (!trip) return { ok: false, reason: "not_found" };

  if (trip.cancelled_at) return { ok: false, reason: "cancelled" };

  if (trip.driver_completed_at && trip.passenger_completed_at) {
    return { ok: false, reason: "completed" };
  }

  if (trip.owner_id === userId) return { ok: false, reason: "self" };

  if (await isTripParticipant(tripId, userId)) return { ok: true };

  if (Number(trip.taken_seats) >= trip.total_seats) {
    return { ok: false, reason: "full" };
  }

  if ((await leaveCount(tripId, userId)) >= MAX_LEAVES_PER_TRIP) {
    return { ok: false, reason: "too_many_cancellations" };
  }

  await sql`
    INSERT INTO trip_participants (trip_id, user_id) VALUES (${tripId}, ${userId})
    ON CONFLICT (trip_id, user_id) DO NOTHING
  `;

  return { ok: true };
}

type LifecycleRow = {
  driver_arrived_at: string | null;
  driver_confirmed_at: string | null;
  passenger_confirmed_at: string | null;
  driver_completed_at: string | null;
  passenger_completed_at: string | null;
  cancelled_at: string | null;
};

export type TripLifecycle = {
  driverArrived: boolean;
  driverArrivedAt: string | null;
  driverConfirmed: boolean;
  passengerConfirmed: boolean;
  started: boolean;
  startedAt: string | null;
  driverCompleted: boolean;
  passengerCompleted: boolean;
  completed: boolean;
  completedAt: string | null;
  cancelled: boolean;
  cancelledAt: string | null;
};

export async function getTripLifecycle(tripId: number): Promise<TripLifecycle> {
  const rows = await sql<LifecycleRow[]>`
    SELECT driver_arrived_at, driver_confirmed_at, passenger_confirmed_at,
           driver_completed_at, passenger_completed_at, cancelled_at
    FROM trips WHERE id = ${tripId}
  `;

  const row = rows[0];

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
    driverArrived: !!row?.driver_arrived_at,
    driverArrivedAt: row?.driver_arrived_at ?? null,
    driverConfirmed,
    passengerConfirmed,
    started,
    startedAt,
    driverCompleted,
    passengerCompleted,
    completed,
    completedAt,
    cancelled: !!row?.cancelled_at,
    cancelledAt: row?.cancelled_at ?? null,
  };
}

export type ConfirmResult =
  | { ok: true; status: TripLifecycle }
  | { ok: false; reason: "not_found" | "not_allowed" | "not_started" };

export type ParticipantConfirmation = {
  userId: number;
  name: string;
  startConfirmed: boolean;
  completeConfirmed: boolean;
};

export async function getParticipantConfirmations(
  tripId: number
): Promise<ParticipantConfirmation[]> {
  const rows = await sql<
    {
      user_id: number;
      name: string;
      start_confirmed_at: string | null;
      complete_confirmed_at: string | null;
    }[]
  >`
    SELECT trip_participants.user_id as user_id, users.name as name,
           trip_participants.start_confirmed_at as start_confirmed_at,
           trip_participants.complete_confirmed_at as complete_confirmed_at
    FROM trip_participants
    JOIN users ON users.id = trip_participants.user_id
    WHERE trip_participants.trip_id = ${tripId}
    ORDER BY trip_participants.joined_at ASC
  `;

  return rows.map((r) => ({
    userId: r.user_id,
    name: r.name,
    startConfirmed: !!r.start_confirmed_at,
    completeConfirmed: !!r.complete_confirmed_at,
  }));
}

export type ReviewPrompt = {
  revieweeId: number;
  revieweeName: string;
};

export type TripStartDetail = TripLifecycle & {
  isDriver: boolean;
  isPassenger: boolean;
  myStartConfirmed: boolean;
  myCompleteConfirmed: boolean;
  participants: ParticipantConfirmation[];
  reviewPrompt: ReviewPrompt | null;
};

export async function getTripStartDetail(
  tripId: number,
  userId: number | null
): Promise<TripStartDetail> {
  const [lifecycle, participants, ownerRows] = await Promise.all([
    getTripLifecycle(tripId),
    getParticipantConfirmations(tripId),
    sql<{ id: number; name: string }[]>`
      SELECT trips.owner_id as id, users.name as name
      FROM trips JOIN users ON users.id = trips.owner_id
      WHERE trips.id = ${tripId}
    `,
  ]);

  const owner = ownerRows[0] ?? null;
  const ownerId = owner?.id ?? null;

  const isDriver = userId !== null && ownerId === userId;
  const myParticipant =
    userId !== null ? participants.find((p) => p.userId === userId) : undefined;
  const isPassenger = !!myParticipant;

  const myStartConfirmed = isDriver
    ? lifecycle.driverConfirmed
    : !!myParticipant?.startConfirmed;

  const myCompleteConfirmed = isDriver
    ? lifecycle.driverCompleted
    : !!myParticipant?.completeConfirmed;

  let reviewPrompt: ReviewPrompt | null = null;

  if (lifecycle.completed && userId !== null && !(await hasReviewed(tripId, userId))) {
    if (isDriver && participants.length === 1 && participants[0].userId !== userId) {
      reviewPrompt = { revieweeId: participants[0].userId, revieweeName: participants[0].name };
    } else if (isPassenger && owner && ownerId !== userId) {
      reviewPrompt = { revieweeId: owner.id, revieweeName: owner.name };
    }
  }

  return {
    ...lifecycle,
    isDriver,
    isPassenger,
    myStartConfirmed,
    myCompleteConfirmed,
    participants,
    reviewPrompt,
  };
}

export async function confirmDriverArrival(
  tripId: number,
  userId: number
): Promise<ConfirmResult> {
  const owner = await getTripOwnerIdOrNull(tripId);

  if (owner === undefined) return { ok: false, reason: "not_found" };
  if (owner !== userId) return { ok: false, reason: "not_allowed" };

  await sql`
    UPDATE trips SET driver_arrived_at = COALESCE(driver_arrived_at, ${sql.unsafe(NOW)})
    WHERE id = ${tripId}
  `;

  return { ok: true, status: await getTripLifecycle(tripId) };
}

export async function confirmTripStart(
  tripId: number,
  userId: number
): Promise<ConfirmResult> {
  const owner = await getTripOwnerIdOrNull(tripId);

  if (owner === undefined) return { ok: false, reason: "not_found" };

  const isDriver = owner === userId;
  const isPassenger = await isTripParticipant(tripId, userId);

  if (!isDriver && !isPassenger) {
    return { ok: false, reason: "not_allowed" };
  }

  await sql.begin(async (tx) => {
    if (isDriver) {
      await tx`
        UPDATE trips SET
          driver_arrived_at = COALESCE(driver_arrived_at, ${tx.unsafe(NOW)}),
          driver_confirmed_at = COALESCE(driver_confirmed_at, ${tx.unsafe(NOW)})
        WHERE id = ${tripId}
      `;
    }

    if (isPassenger) {
      await tx`
        UPDATE trip_participants
        SET start_confirmed_at = COALESCE(start_confirmed_at, ${tx.unsafe(NOW)})
        WHERE trip_id = ${tripId} AND user_id = ${userId}
      `;

      const remaining = await tx<{ c: string }[]>`
        SELECT COUNT(*) as c FROM trip_participants
        WHERE trip_id = ${tripId} AND start_confirmed_at IS NULL
      `;

      if (Number(remaining[0].c) === 0) {
        await tx`
          UPDATE trips SET passenger_confirmed_at = COALESCE(passenger_confirmed_at, ${tx.unsafe(NOW)})
          WHERE id = ${tripId}
        `;
      }
    }
  });

  return { ok: true, status: await getTripLifecycle(tripId) };
}

export async function confirmTripComplete(
  tripId: number,
  userId: number
): Promise<ConfirmResult> {
  const owner = await getTripOwnerIdOrNull(tripId);

  if (owner === undefined) return { ok: false, reason: "not_found" };

  const isDriver = owner === userId;
  const isPassenger = await isTripParticipant(tripId, userId);

  if (!isDriver && !isPassenger) {
    return { ok: false, reason: "not_allowed" };
  }

  if (!(await getTripLifecycle(tripId)).started) {
    return { ok: false, reason: "not_started" };
  }

  await sql.begin(async (tx) => {
    if (isDriver) {
      await tx`
        UPDATE trips SET driver_completed_at = COALESCE(driver_completed_at, ${tx.unsafe(NOW)})
        WHERE id = ${tripId}
      `;
    }

    if (isPassenger) {
      await tx`
        UPDATE trip_participants
        SET complete_confirmed_at = COALESCE(complete_confirmed_at, ${tx.unsafe(NOW)})
        WHERE trip_id = ${tripId} AND user_id = ${userId}
      `;

      const remaining = await tx<{ c: string }[]>`
        SELECT COUNT(*) as c FROM trip_participants
        WHERE trip_id = ${tripId} AND complete_confirmed_at IS NULL
      `;

      if (Number(remaining[0].c) === 0) {
        await tx`
          UPDATE trips SET passenger_completed_at = COALESCE(passenger_completed_at, ${tx.unsafe(NOW)})
          WHERE id = ${tripId}
        `;
      }
    }
  });

  return { ok: true, status: await getTripLifecycle(tripId) };
}

// Distinguishes "trip not found" (undefined) from "trip found but owner_id is NULL" (null).
async function getTripOwnerIdOrNull(
  tripId: number
): Promise<number | null | undefined> {
  const rows = await sql<{ owner_id: number | null }[]>`
    SELECT owner_id FROM trips WHERE id = ${tripId}
  `;

  return rows[0] ? rows[0].owner_id : undefined;
}

export type CancelResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "not_allowed" | "already_started" | "already_done" };

export async function cancelTrip(tripId: number, userId: number): Promise<CancelResult> {
  const owner = await getTripOwnerIdOrNull(tripId);

  if (owner === undefined) return { ok: false, reason: "not_found" };
  if (owner !== userId) return { ok: false, reason: "not_allowed" };

  const lifecycle = await getTripLifecycle(tripId);

  if (lifecycle.cancelled || lifecycle.completed) {
    return { ok: false, reason: "already_done" };
  }

  if (lifecycle.started) {
    return { ok: false, reason: "already_started" };
  }

  await sql.begin(async (tx) => {
    await tx`UPDATE trips SET cancelled_at = ${tx.unsafe(NOW)} WHERE id = ${tripId}`;

    await tx`
      UPDATE taxi_orders SET status = 'cancelled'
      WHERE trip_id = ${tripId} AND status != 'cancelled'
    `;
  });

  return { ok: true };
}

type DealRow = {
  deal_price: number | null;
  driver_deal_at: string | null;
  passenger_deal_at: string | null;
};

export type TripDeal = {
  price: number | null;
  driverConfirmed: boolean;
  passengerConfirmed: boolean;
  finalized: boolean;
};

export async function getTripDeal(tripId: number): Promise<TripDeal> {
  const rows = await sql<DealRow[]>`
    SELECT deal_price, driver_deal_at, passenger_deal_at FROM trips WHERE id = ${tripId}
  `;

  const row = rows[0];

  const driverConfirmed = !!row?.driver_deal_at;
  const passengerConfirmed = !!row?.passenger_deal_at;

  return {
    price: row?.deal_price ?? null,
    driverConfirmed,
    passengerConfirmed,
    finalized: driverConfirmed && passengerConfirmed,
  };
}

export type SubmitDealResult =
  | { ok: true; deal: TripDeal }
  | { ok: false; reason: "not_found" | "not_allowed" };

export async function submitDeal(
  tripId: number,
  userId: number,
  price: number
): Promise<SubmitDealResult> {
  const owner = await getTripOwnerIdOrNull(tripId);

  if (owner === undefined) return { ok: false, reason: "not_found" };

  const isDriver = owner === userId;
  const isPassenger = await isTripParticipant(tripId, userId);

  if (!isDriver && !isPassenger) {
    return { ok: false, reason: "not_allowed" };
  }

  const current = await getTripDeal(tripId);

  await sql.begin(async (tx) => {
    if (current.price !== price) {
      await tx`
        UPDATE trips SET deal_price = ${price}, driver_deal_at = NULL, passenger_deal_at = NULL
        WHERE id = ${tripId}
      `;
    }

    if (isDriver) {
      await tx`
        UPDATE trips SET driver_deal_at = COALESCE(driver_deal_at, ${tx.unsafe(NOW)})
        WHERE id = ${tripId}
      `;
    }

    if (isPassenger) {
      await tx`
        UPDATE trips SET passenger_deal_at = COALESCE(passenger_deal_at, ${tx.unsafe(NOW)})
        WHERE id = ${tripId}
      `;
    }

    const dealRows = await tx<DealRow[]>`
      SELECT deal_price, driver_deal_at, passenger_deal_at FROM trips WHERE id = ${tripId}
    `;

    const dealRow = dealRows[0];
    const finalized = !!dealRow?.driver_deal_at && !!dealRow?.passenger_deal_at;

    if (finalized && dealRow?.deal_price !== null && dealRow?.deal_price !== undefined) {
      await tx`UPDATE trips SET price = ${dealRow.deal_price} WHERE id = ${tripId}`;
    }
  });

  return { ok: true, deal: await getTripDeal(tripId) };
}

const COMPLETED_CLAUSE = sql`
  driver_completed_at IS NOT NULL AND passenger_completed_at IS NOT NULL
`;

export async function countTripsAsDriver(userId: number): Promise<number> {
  const rows = await sql<{ count: string }[]>`
    SELECT COUNT(*) as count FROM trips WHERE owner_id = ${userId} AND ${COMPLETED_CLAUSE}
  `;

  return Number(rows[0].count);
}

export async function countTripsAsPassenger(userId: number): Promise<number> {
  const rows = await sql<{ count: string }[]>`
    SELECT COUNT(*) as count
    FROM trip_participants
    JOIN trips ON trips.id = trip_participants.trip_id
    WHERE trip_participants.user_id = ${userId} AND ${COMPLETED_CLAUSE}
  `;

  return Number(rows[0].count);
}

export async function getDriverEarnings(userId: number): Promise<number> {
  const rows = await sql<{ total: string }[]>`
    SELECT COALESCE(SUM(trips.price * (
      SELECT COUNT(*) FROM trip_participants WHERE trip_participants.trip_id = trips.id
    )), 0) as total
    FROM trips
    WHERE trips.owner_id = ${userId} AND ${COMPLETED_CLAUSE}
  `;

  return Number(rows[0].total);
}

export async function countActiveTripsByOwner(ownerId: number): Promise<number> {
  const rows = await sql<{ count: string }[]>`
    SELECT COUNT(*) as count FROM trips WHERE owner_id = ${ownerId} AND ${ACTIVE_CLAUSE}
  `;

  return Number(rows[0].count);
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
  transportCategory?: string;
  carModel?: string;
  licensePlate?: string;
};

export async function createTrip(
  input: CreateTripInput,
  owner: { id: number; name: string },
  executor: postgres.ISql = sql
): Promise<number> {
  const rows = await executor<{ id: number }[]>`
    INSERT INTO trips
      (type, from_city, to_city, trip_date, trip_time, price, total_seats, transport, transport_category, car_model, license_plate, driver_name, owner_id, verified)
    VALUES (
      ${input.type}, ${input.from}, ${input.to}, ${input.date}, ${input.time},
      ${input.price}, ${input.totalSeats}, ${input.transport}, ${input.transportCategory ?? null},
      ${input.carModel ?? null}, ${input.licensePlate ?? null},
      ${owner.name}, ${owner.id}, 0
    )
    RETURNING id
  `;

  return rows[0].id;
}

export type BlockingTripInfo = {
  tripId: number;
  route: string;
  requiredRole: "driver" | "passenger";
  minutesUntil: number;
  started: boolean;
};

type BlockingRow = {
  id: number;
  owner_id: number | null;
  from_city: string;
  to_city: string;
  trip_date: string;
  trip_time: string;
  driver_confirmed_at: string | null;
  passenger_confirmed_at: string | null;
};

const TRIP_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TRIP_TIME_RE = /^\d{2}:\d{2}$/;

// Едем30 работает только в Астраханской области (UTC+4, без перехода на
// летнее время) — трактуем наивные trip_date/trip_time как местное время
// этого региона, а не как время сервера/клиента.
const ASTRAKHAN_OFFSET_MS = 4 * 60 * 60_000;

export async function getBlockingTripInfo(
  userId: number
): Promise<BlockingTripInfo | null> {
  const rows = await sql<BlockingRow[]>`
    SELECT trips.id, trips.owner_id, trips.from_city, trips.to_city,
           trips.trip_date, trips.trip_time,
           trips.driver_confirmed_at, trips.passenger_confirmed_at
    FROM trips
    WHERE (
      trips.owner_id = ${userId}
      OR trips.id IN (SELECT trip_id FROM trip_participants WHERE user_id = ${userId})
    )
    AND trips.cancelled_at IS NULL
    AND NOT (trips.driver_completed_at IS NOT NULL AND trips.passenger_completed_at IS NOT NULL)
  `;

  const now = Date.now();
  let best: BlockingTripInfo | null = null;

  for (const row of rows) {
    const requiredRole = row.owner_id === userId ? "driver" : "passenger";
    const route = `${row.from_city} → ${row.to_city}`;
    const started = !!row.driver_confirmed_at && !!row.passenger_confirmed_at;

    if (started) {
      return { tripId: row.id, route, requiredRole, minutesUntil: 0, started: true };
    }

    if (!TRIP_DATE_RE.test(row.trip_date) || !TRIP_TIME_RE.test(row.trip_time)) {
      continue;
    }

    const startsAtUtcMs =
      new Date(`${row.trip_date}T${row.trip_time}:00Z`).getTime() - ASTRAKHAN_OFFSET_MS;

    const minutesUntil = Math.round((startsAtUtcMs - now) / 60_000);

    if (minutesUntil >= 0 && minutesUntil <= 15) {
      if (!best || minutesUntil < best.minutesUntil) {
        best = { tripId: row.id, route, requiredRole, minutesUntil, started: false };
      }
    }
  }

  return best;
}

export type EmptyTripWarning = {
  tripId: number;
  route: string;
  minutesUntil: number;
};

const EMPTY_TRIP_WARNING_WINDOW_MIN = 10;

// Межгородние поездки водителя без единого попутчика, до отправления
// которых осталось не больше 10 минут — показываем предупреждение, что
// поездка скоро закроется автоматически.
export async function getEmptyTripWarnings(
  driverId: number
): Promise<EmptyTripWarning[]> {
  const rows = await sql<
    { id: number; from_city: string; to_city: string; trip_date: string; trip_time: string }[]
  >`
    SELECT trips.id, trips.from_city, trips.to_city, trips.trip_date, trips.trip_time
    FROM trips
    WHERE trips.owner_id = ${driverId}
      AND trips.type = 'intercity'
      AND trips.cancelled_at IS NULL
      AND trips.driver_completed_at IS NULL
      AND (SELECT COUNT(*) FROM trip_participants WHERE trip_participants.trip_id = trips.id) = 0
  `;

  const now = Date.now();
  const warnings: EmptyTripWarning[] = [];

  for (const row of rows) {
    if (!TRIP_DATE_RE.test(row.trip_date) || !TRIP_TIME_RE.test(row.trip_time)) {
      continue;
    }

    const startsAtUtcMs =
      new Date(`${row.trip_date}T${row.trip_time}:00Z`).getTime() - ASTRAKHAN_OFFSET_MS;

    const minutesUntil = Math.round((startsAtUtcMs - now) / 60_000);

    if (minutesUntil >= 0 && minutesUntil <= EMPTY_TRIP_WARNING_WINDOW_MIN) {
      warnings.push({
        tripId: row.id,
        route: `${row.from_city} → ${row.to_city}`,
        minutesUntil,
      });
    }
  }

  return warnings;
}

// Опportunistic-очистка: межгородние поездки без попутчиков, время
// отправления которых уже наступило, автоматически отменяются. Настоящего
// крон-планировщика в проекте нет — функция вызывается при каждой загрузке
// списка поездок, так что закрытие происходит с задержкой до следующего
// обращения к сайту (обычно секунды-минуты), а не строго по таймеру.
export async function autoCancelEmptyIntercityTrips(): Promise<void> {
  await sql`
    UPDATE trips
    SET cancelled_at = ${sql.unsafe(NOW)}
    WHERE type = 'intercity'
      AND cancelled_at IS NULL
      AND driver_completed_at IS NULL
      AND (SELECT COUNT(*) FROM trip_participants WHERE trip_participants.trip_id = trips.id) = 0
      AND trip_date ~ '^\\d{4}-\\d{2}-\\d{2}$'
      AND trip_time ~ '^\\d{2}:\\d{2}$'
      AND (to_timestamp(trip_date || ' ' || trip_time, 'YYYY-MM-DD HH24:MI') - interval '4 hours') < now()
  `;
}
