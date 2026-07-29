import "server-only";

import { sql } from "@/lib/db";

export type RideRequestStatus = "open" | "closed" | "cancelled";

export type RideRequest = {
  id: number;
  passengerId: number;
  passengerName: string;
  passengerAvatarUrl: string | null;
  passengerAvatarPreset: string | null;
  passengerRating: number | null;
  passengerReviewsCount: number;
  from: string;
  to: string;
  date: string;
  time: string;
  passengersCount: number;
  comment: string | null;
  status: RideRequestStatus;
  acceptedDriverId: number | null;
  responsesCount: number;
  createdAt: string;
};

const REQUEST_SELECT = sql`
  SELECT
    r.id as "id",
    r.passenger_id as "passengerId",
    u.name as "passengerName",
    u.avatar_url as "passengerAvatarUrl",
    u.avatar_preset as "passengerAvatarPreset",
    (SELECT AVG(rating)::float FROM reviews WHERE reviewee_id = r.passenger_id) as "passengerRating",
    (SELECT COUNT(*) FROM reviews WHERE reviewee_id = r.passenger_id) as "passengerReviewsCount",
    r.from_city as "from",
    r.to_city as "to",
    r.trip_date as "date",
    r.trip_time as "time",
    r.passengers_count as "passengersCount",
    r.comment as "comment",
    r.status as "status",
    r.accepted_driver_id as "acceptedDriverId",
    (SELECT COUNT(*) FROM ride_request_responses WHERE request_id = r.id) as "responsesCount",
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
  input: CreateRideRequestInput
): Promise<number> {
  const [row] = await sql<{ id: number }[]>`
    INSERT INTO ride_requests (passenger_id, from_city, to_city, trip_date, trip_time, passengers_count, comment)
    VALUES (
      ${passengerId}, ${input.from}, ${input.to}, ${input.date}, ${input.time},
      ${input.passengersCount}, ${input.comment ?? null}
    )
    RETURNING id
  `;

  return row.id;
}

/** Открытые заявки, новые сверху — для ленты "Пассажиры ищут водителя". */
export async function listOpenRideRequests(): Promise<RideRequest[]> {
  const rows = await sql<(RideRequest & { responsesCount: string | number })[]>`
    ${REQUEST_SELECT}
    WHERE r.status = 'open'
    ORDER BY r.created_at DESC
  `;

  return rows.map((r) => ({ ...r, responsesCount: Number(r.responsesCount) }));
}

export async function getRideRequest(id: number): Promise<RideRequest | null> {
  const rows = await sql<(RideRequest & { responsesCount: string | number })[]>`
    ${REQUEST_SELECT}
    WHERE r.id = ${id}
  `;

  const row = rows[0];
  if (!row) return null;

  return { ...row, responsesCount: Number(row.responsesCount) };
}

export async function listMyRideRequests(passengerId: number): Promise<RideRequest[]> {
  const rows = await sql<(RideRequest & { responsesCount: string | number })[]>`
    ${REQUEST_SELECT}
    WHERE r.passenger_id = ${passengerId}
    ORDER BY r.created_at DESC
  `;

  return rows.map((r) => ({ ...r, responsesCount: Number(r.responsesCount) }));
}

export type RideRequestResponseRow = {
  id: number;
  driverId: number;
  driverName: string;
  driverAvatarUrl: string | null;
  driverAvatarPreset: string | null;
  driverRating: number | null;
  driverReviewsCount: number;
  conversationId: number | null;
  createdAt: string;
};

export async function listResponsesForRequest(requestId: number): Promise<RideRequestResponseRow[]> {
  const rows = await sql<(RideRequestResponseRow & { driverReviewsCount: string | number })[]>`
    SELECT
      rr.id as "id",
      rr.driver_id as "driverId",
      u.name as "driverName",
      u.avatar_url as "driverAvatarUrl",
      u.avatar_preset as "driverAvatarPreset",
      (SELECT AVG(rating)::float FROM reviews WHERE reviewee_id = rr.driver_id) as "driverRating",
      (SELECT COUNT(*) FROM reviews WHERE reviewee_id = rr.driver_id) as "driverReviewsCount",
      rr.conversation_id as "conversationId",
      rr.created_at as "createdAt"
    FROM ride_request_responses rr
    JOIN users u ON u.id = rr.driver_id
    WHERE rr.request_id = ${requestId}
    ORDER BY rr.created_at ASC
  `;

  return rows.map((r) => ({ ...r, driverReviewsCount: Number(r.driverReviewsCount) }));
}

export async function hasDriverResponded(requestId: number, driverId: number): Promise<boolean> {
  const rows = await sql<{ id: number }[]>`
    SELECT id FROM ride_request_responses WHERE request_id = ${requestId} AND driver_id = ${driverId}
  `;

  return rows.length > 0;
}

export async function recordResponse(
  requestId: number,
  driverId: number,
  conversationId: number
): Promise<void> {
  await sql`
    INSERT INTO ride_request_responses (request_id, driver_id, conversation_id)
    VALUES (${requestId}, ${driverId}, ${conversationId})
    ON CONFLICT (request_id, driver_id) DO UPDATE SET conversation_id = EXCLUDED.conversation_id
  `;
}

export type CloseRideRequestResult =
  | { ok: true }
  | { ok: false; error: string };

export async function closeRideRequest(
  requestId: number,
  passengerId: number,
  acceptedDriverId?: number
): Promise<CloseRideRequestResult> {
  const rows = await sql<{ id: number; passengerId: number; status: RideRequestStatus }[]>`
    SELECT id, passenger_id as "passengerId", status FROM ride_requests WHERE id = ${requestId}
  `;

  const request = rows[0];

  if (!request) return { ok: false, error: "Заявка не найдена" };
  if (request.passengerId !== passengerId) return { ok: false, error: "Это не ваша заявка" };
  if (request.status !== "open") return { ok: false, error: "Заявка уже закрыта" };

  await sql`
    UPDATE ride_requests
    SET status = 'closed', accepted_driver_id = ${acceptedDriverId ?? null}, closed_at = now()
    WHERE id = ${requestId}
  `;

  return { ok: true };
}

export async function cancelRideRequest(
  requestId: number,
  passengerId: number
): Promise<CloseRideRequestResult> {
  const rows = await sql<{ id: number; passengerId: number; status: RideRequestStatus }[]>`
    SELECT id, passenger_id as "passengerId", status FROM ride_requests WHERE id = ${requestId}
  `;

  const request = rows[0];

  if (!request) return { ok: false, error: "Заявка не найдена" };
  if (request.passengerId !== passengerId) return { ok: false, error: "Это не ваша заявка" };
  if (request.status !== "open") return { ok: false, error: "Заявка уже закрыта" };

  await sql`UPDATE ride_requests SET status = 'cancelled', closed_at = now() WHERE id = ${requestId}`;

  return { ok: true };
}
