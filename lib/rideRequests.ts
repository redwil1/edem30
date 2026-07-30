import "server-only";

import { sql } from "@/lib/db";
import { createFormingTrip, joinFormingTrip, leaveFormingTrip } from "@/lib/trips";

export type RideRequestStatus = "open" | "closed" | "cancelled";

export type RideRequest = {
  id: number;
  passengerId: number;
  passengerName: string;
  passengerAvatarUrl: string | null;
  passengerAvatarPreset: string | null;
  from: string;
  to: string;
  date: string;
  time: string;
  passengersCount: number;
  comment: string | null;
  status: RideRequestStatus;
  tripId: number | null;
  createdAt: string;
};

const REQUEST_SELECT = sql`
  SELECT
    r.id as "id",
    r.passenger_id as "passengerId",
    u.name as "passengerName",
    u.avatar_url as "passengerAvatarUrl",
    u.avatar_preset as "passengerAvatarPreset",
    r.from_city as "from",
    r.to_city as "to",
    r.trip_date as "date",
    r.trip_time as "time",
    r.passengers_count as "passengersCount",
    r.comment as "comment",
    r.status as "status",
    r.trip_id as "tripId",
    r.created_at as "createdAt"
  FROM ride_requests r
  JOIN users u ON u.id = r.passenger_id
`;

export type CreateRideRequestInput = {
  from: string;
  to: string;
  date: string;
  time: string;
  passengersCount: number;
  comment?: string;
};

export async function createRideRequest(
  passengerId: number,
  input: CreateRideRequestInput,
  tripId: number | null
): Promise<number> {
  const [row] = await sql<{ id: number }[]>`
    INSERT INTO ride_requests (passenger_id, from_city, to_city, trip_date, trip_time, passengers_count, comment, trip_id)
    VALUES (
      ${passengerId}, ${input.from}, ${input.to}, ${input.date}, ${input.time},
      ${input.passengersCount}, ${input.comment ?? null}, ${tripId}
    )
    RETURNING id
  `;

  return row.id;
}

/**
 * Создаёт заявку и сразу привязывает её к формирующейся поездке (trips,
 * owner_id = NULL) — присоединяется к уже существующей группе на этот
 * маршрут/время, либо заводит новую. trip_id не меняется до конца жизни
 * поездки: та же строка потом становится обычной поездкой, когда её
 * заберёт водитель (см. claimFormingTrip в lib/trips.ts).
 */
export async function createRideRequestForming(
  passengerId: number,
  input: CreateRideRequestInput
): Promise<{ requestId: number; tripId: number; existingCluster: RideRequestCluster | null }> {
  const existingCluster = await findMatchingCluster(input.from, input.to, input.date, input.time);
  const existingTripId = existingCluster?.requests.find((r) => r.tripId !== null)?.tripId ?? null;

  let tripId: number;

  if (existingTripId !== null) {
    tripId = existingTripId;
    await joinFormingTrip(tripId, passengerId, input.passengersCount);
  } else {
    tripId = await createFormingTrip({
      from: input.from,
      to: input.to,
      date: input.date,
      time: input.time,
      totalSeats: input.passengersCount,
    });
    await joinFormingTrip(tripId, passengerId, 0);
  }

  const requestId = await createRideRequest(passengerId, input, tripId);

  return { requestId, tripId, existingCluster };
}

/** Открытые заявки — сырой список, для группировки в кластеры на JS-стороне. */
export async function listOpenRideRequests(): Promise<RideRequest[]> {
  return sql<RideRequest[]>`
    ${REQUEST_SELECT}
    WHERE r.status = 'open'
    ORDER BY r.created_at ASC
  `;
}

export async function getRideRequest(id: number): Promise<RideRequest | null> {
  const rows = await sql<RideRequest[]>`
    ${REQUEST_SELECT}
    WHERE r.id = ${id}
  `;

  return rows[0] ?? null;
}

export async function getRideRequestsByIds(ids: number[]): Promise<RideRequest[]> {
  if (ids.length === 0) return [];

  return sql<RideRequest[]>`
    ${REQUEST_SELECT}
    WHERE r.id = ANY(${ids})
  `;
}

/** Открытые заявки, уже привязанные к конкретной формирующейся поездке — для CTA "Стать водителем" на странице поездки. */
export async function listOpenRideRequestsByTrip(tripId: number): Promise<RideRequest[]> {
  return sql<RideRequest[]>`
    ${REQUEST_SELECT}
    WHERE r.trip_id = ${tripId} AND r.status = 'open'
  `;
}

export async function listMyRideRequests(passengerId: number): Promise<RideRequest[]> {
  return sql<RideRequest[]>`
    ${REQUEST_SELECT}
    WHERE r.passenger_id = ${passengerId}
    ORDER BY r.created_at DESC
  `;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export type RideRequestCluster = {
  from: string;
  to: string;
  date: string;
  time: string; // время самой ранней заявки в кластере
  requests: RideRequest[];
  waitingCount: number; // сумма passengersCount по кластеру
};

/**
 * Группирует открытые заявки в "формирующиеся поездки": один маршрут+дата,
 * время отличается не больше чем на 30 минут (последовательно — если A и B
 * в 30 минутах друг от друга, а B и C тоже, то A/B/C попадают в один
 * кластер, даже если A и C дальше 30 минут друг от друга).
 */
export function clusterRideRequests(requests: RideRequest[]): RideRequestCluster[] {
  const byRoute = new Map<string, RideRequest[]>();

  for (const r of requests) {
    const key = `${r.from}|${r.to}|${r.date}`;
    const list = byRoute.get(key);
    if (list) list.push(r);
    else byRoute.set(key, [r]);
  }

  const clusters: RideRequestCluster[] = [];

  for (const group of byRoute.values()) {
    const sorted = [...group].sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
    let current: RideRequest[] = [];

    for (const r of sorted) {
      const last = current[current.length - 1];
      if (last && timeToMinutes(r.time) - timeToMinutes(last.time) > 30) {
        clusters.push(buildCluster(current));
        current = [r];
      } else {
        current.push(r);
      }
    }

    if (current.length > 0) clusters.push(buildCluster(current));
  }

  return clusters.sort((a, b) => b.waitingCount - a.waitingCount);
}

function buildCluster(requests: RideRequest[]): RideRequestCluster {
  return {
    from: requests[0].from,
    to: requests[0].to,
    date: requests[0].date,
    time: requests[0].time,
    requests,
    waitingCount: uniqueByPassenger(requests).reduce((sum, r) => sum + r.passengersCount, 0),
  };
}

/**
 * Один и тот же пассажир может оставить несколько заявок на один и тот же
 * формирующийся маршрут (например поменял желаемое время) — при подсчёте
 * "сколько людей ждут" и в списке участников он не должен считаться
 * дважды. Оставляем самую раннюю (по id) заявку каждого пассажира.
 */
export function uniqueByPassenger(requests: RideRequest[]): RideRequest[] {
  const byPassenger = new Map<number, RideRequest>();

  for (const r of requests) {
    const existing = byPassenger.get(r.passengerId);
    if (!existing || r.id < existing.id) byPassenger.set(r.passengerId, r);
  }

  return [...byPassenger.values()];
}

/** Кластер, к которому присоединилась бы заявка с такими параметрами (если есть). */
export async function findMatchingCluster(
  from: string,
  to: string,
  date: string,
  time: string
): Promise<RideRequestCluster | null> {
  const open = await listOpenRideRequests();
  const candidateMinutes = timeToMinutes(time);

  const matching = open.filter(
    (r) => r.from === from && r.to === to && r.date === date && Math.abs(timeToMinutes(r.time) - candidateMinutes) <= 30
  );

  if (matching.length === 0) return null;

  return buildCluster(matching);
}

/**
 * Атомарно закрывает все заявки кластера и привязывает их к реальной
 * поездке. Возвращает id пассажиров, чьи заявки реально были закрыты
 * этим вызовом (на случай гонки — если другой водитель уже забрал часть).
 */
export async function fulfillRideRequests(
  requestIds: number[],
  tripId: number
): Promise<number[]> {
  if (requestIds.length === 0) return [];

  const rows = await sql<{ passengerId: number }[]>`
    UPDATE ride_requests
    SET status = 'closed', trip_id = ${tripId}, closed_at = now()
    WHERE id = ANY(${requestIds}) AND status = 'open'
    RETURNING passenger_id as "passengerId"
  `;

  return rows.map((r) => r.passengerId);
}

/** Пассажир отменяет свою собственную ещё не закрытую заявку. */
export async function cancelRideRequest(
  requestId: number,
  passengerId: number
): Promise<{ ok: true } | { ok: false; error: string }> {
  const rows = await sql<
    { id: number; passengerId: number; status: RideRequestStatus; tripId: number | null; passengersCount: number }[]
  >`
    SELECT id, passenger_id as "passengerId", status, trip_id as "tripId", passengers_count as "passengersCount"
    FROM ride_requests WHERE id = ${requestId}
  `;

  const request = rows[0];

  if (!request) return { ok: false, error: "Заявка не найдена" };
  if (request.passengerId !== passengerId) return { ok: false, error: "Это не ваша заявка" };
  if (request.status !== "open") return { ok: false, error: "Заявка уже закрыта" };

  await sql`UPDATE ride_requests SET status = 'cancelled', closed_at = now() WHERE id = ${requestId}`;

  // Пока поездка ещё формируется (водитель не найден) — покинуть группу/чат,
  // чтобы место и список участников оставались честными.
  if (request.tripId !== null) {
    await leaveFormingTrip(request.tripId, passengerId);
  }

  return { ok: true };
}

/**
 * Если у отменённой поездки были заявки, которые она закрыла — переоткрыть
 * их (формирующаяся поездка "воскресает" с теми же пассажирами).
 * Возвращает id пассажиров, которых нужно уведомить.
 */
export async function restoreRideRequestsForTrip(tripId: number): Promise<number[]> {
  const rows = await sql<{ passengerId: number }[]>`
    UPDATE ride_requests
    SET status = 'open', trip_id = NULL, closed_at = NULL
    WHERE trip_id = ${tripId} AND status = 'closed'
    RETURNING passenger_id as "passengerId"
  `;

  return rows.map((r) => r.passengerId);
}
