import "server-only";

import crypto from "crypto";

import { sql } from "@/lib/db";
import { getCurrentUser, hashPassword, UserRole } from "@/lib/auth";

export async function requireAdmin() {
  const user = await getCurrentUser();

  if (!user || user.role !== "admin") return null;

  return user;
}

export type TripTypeCounts = {
  intercity: number;
  city: number;
};

export type AdminStats = {
  usersCount: number;
  tripsCount: number;
  tripsByType: TripTypeCounts;
  reviewsCount: number;
  reviewsByType: TripTypeCounts;
  newReportsCount: number;
};

export async function getAdminStats(): Promise<AdminStats> {
  const [users, trips, tripsByTypeRows, reviews, reviewsByTypeRows, reports] =
    await Promise.all([
      sql<{ c: string }[]>`SELECT COUNT(*) as c FROM users`,
      sql<{ c: string }[]>`SELECT COUNT(*) as c FROM trips`,
      sql<{ type: string; c: string }[]>`
        SELECT type, COUNT(*) as c FROM trips GROUP BY type
      `,
      sql<{ c: string }[]>`SELECT COUNT(*) as c FROM reviews`,
      sql<{ type: string; c: string }[]>`
        SELECT trips.type as type, COUNT(*) as c
        FROM reviews
        JOIN trips ON trips.id = reviews.trip_id
        GROUP BY trips.type
      `,
      sql<{ c: string }[]>`SELECT COUNT(*) as c FROM trip_reports WHERE status = 'new'`,
    ]);

  function toTypeCounts(rows: { type: string; c: string }[]): TripTypeCounts {
    const counts: TripTypeCounts = { intercity: 0, city: 0 };

    for (const row of rows) {
      if (row.type === "intercity" || row.type === "city") {
        counts[row.type] = Number(row.c);
      }
    }

    return counts;
  }

  return {
    usersCount: Number(users[0].c),
    tripsCount: Number(trips[0].c),
    tripsByType: toTypeCounts(tripsByTypeRows),
    reviewsCount: Number(reviews[0].c),
    reviewsByType: toTypeCounts(reviewsByTypeRows),
    newReportsCount: Number(reports[0].c),
  };
}

export type VisitPeriodStats = {
  registered: number;
  guest: number;
};

export type VisitStats = {
  day: VisitPeriodStats;
  week: VisitPeriodStats;
  month: VisitPeriodStats;
};

async function visitCountsSince(interval: string): Promise<VisitPeriodStats> {
  const rows = await sql<{ registered: string; guest: string }[]>`
    SELECT
      COUNT(*) FILTER (WHERE user_id IS NOT NULL) as registered,
      COUNT(*) FILTER (WHERE user_id IS NULL) as guest
    FROM site_visits
    WHERE created_at::timestamptz >= now() - ${interval}::interval
  `;

  return {
    registered: Number(rows[0]?.registered ?? 0),
    guest: Number(rows[0]?.guest ?? 0),
  };
}

export async function getVisitStats(): Promise<VisitStats> {
  const [day, week, month] = await Promise.all([
    visitCountsSince("1 day"),
    visitCountsSince("7 days"),
    visitCountsSince("30 days"),
  ]);

  return { day, week, month };
}

export type AdminAccountInfo = {
  id: number;
  name: string;
  lastLoginIp: string | null;
  lastLoginAt: string | null;
};

export async function getAdminAccounts(): Promise<AdminAccountInfo[]> {
  const rows = await sql<
    { id: number; name: string; last_login_ip: string | null; last_login_at: string | null }[]
  >`
    SELECT id, name, last_login_ip, last_login_at
    FROM users
    WHERE role = 'admin'
    ORDER BY id ASC
  `;

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    lastLoginIp: r.last_login_ip,
    lastLoginAt: r.last_login_at,
  }));
}

export type AdminUser = {
  id: number;
  name: string;
  phone: string;
  role: UserRole;
  createdAt: string;
};

type AdminUserRow = {
  id: number;
  name: string;
  phone: string;
  role: UserRole;
  createdat: string;
};

export async function listAdminUsers(search?: string): Promise<AdminUser[]> {
  const rows = await sql<AdminUserRow[]>`
    SELECT id, name, phone, role, created_at as createdAt
    FROM users
    ${search ? sql`WHERE name ILIKE ${`%${search}%`}` : sql``}
    ORDER BY id DESC
  `;

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    phone: r.phone,
    role: r.role,
    createdAt: r.createdat,
  }));
}

const ASSIGNABLE_ROLES: UserRole[] = ["passenger", "driver", "admin"];

export async function setAdminUserRole(
  userId: number,
  role: string
): Promise<boolean> {
  if (!ASSIGNABLE_ROLES.includes(role as UserRole)) return false;

  const result = await sql`UPDATE users SET role = ${role} WHERE id = ${userId}`;

  return result.count > 0;
}

export type AdminTripStatus =
  | "cancelled"
  | "completed"
  | "in_progress"
  | "scheduled";

export type AdminTrip = {
  id: number;
  from: string;
  to: string;
  date: string;
  time: string;
  price: number;
  status: AdminTripStatus;
  driverName: string;
};

type AdminTripRow = {
  id: number;
  from_city: string;
  to_city: string;
  trip_date: string;
  trip_time: string;
  price: number;
  driver_name: string;
  cancelled_at: string | null;
  driver_confirmed_at: string | null;
  passenger_confirmed_at: string | null;
  driver_completed_at: string | null;
  passenger_completed_at: string | null;
};

function tripStatus(row: AdminTripRow): AdminTripStatus {
  if (row.cancelled_at) return "cancelled";
  if (row.driver_completed_at && row.passenger_completed_at) return "completed";
  if (row.driver_confirmed_at && row.passenger_confirmed_at) return "in_progress";
  return "scheduled";
}

function toAdminTrip(row: AdminTripRow): AdminTrip {
  return {
    id: row.id,
    from: row.from_city,
    to: row.to_city,
    date: row.trip_date,
    time: row.trip_time,
    price: row.price,
    status: tripStatus(row),
    driverName: row.driver_name,
  };
}

export async function listAdminTrips(search?: string): Promise<AdminTrip[]> {
  const rows = await sql<AdminTripRow[]>`
    SELECT id, from_city, to_city, trip_date, trip_time, price, driver_name,
           cancelled_at, driver_confirmed_at, passenger_confirmed_at,
           driver_completed_at, passenger_completed_at
    FROM trips
    ${
      search
        ? sql`WHERE from_city ILIKE ${`%${search}%`} OR to_city ILIKE ${`%${search}%`}`
        : sql``
    }
    ORDER BY id DESC
  `;

  return rows.map(toAdminTrip);
}

export type UpdateAdminTripInput = {
  price?: number;
  date?: string;
};

export async function updateAdminTrip(
  tripId: number,
  input: UpdateAdminTripInput
): Promise<boolean> {
  if (input.price === undefined && input.date === undefined) return false;

  const patch: Record<string, unknown> = {};

  if (input.price !== undefined) patch.price = input.price;
  if (input.date !== undefined) patch.trip_date = input.date;

  const result = await sql`
    UPDATE trips SET ${sql(patch)} WHERE id = ${tripId}
  `;

  return result.count > 0;
}

export async function adminCancelTrip(tripId: number): Promise<boolean> {
  const [tripResult] = await Promise.all([
    sql`
      UPDATE trips SET cancelled_at = COALESCE(
        cancelled_at,
        to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
      )
      WHERE id = ${tripId}
    `,
    sql`
      UPDATE taxi_orders SET status = 'cancelled'
      WHERE trip_id = ${tripId} AND status != 'cancelled'
    `,
  ]);

  return tripResult.count > 0;
}

export type AdminReview = {
  id: number;
  authorName: string;
  rating: number;
  comment: string | null;
  tripRoute: string;
  tripId: number;
  tripType: "intercity" | "city";
};

type AdminReviewRow = {
  id: number;
  author_name: string;
  rating: number;
  comment: string | null;
  trip_id: number;
  from_city: string;
  to_city: string;
  trip_type: "intercity" | "city";
};

export async function listAdminReviews(
  minRating?: number,
  tripType?: "intercity" | "city"
): Promise<AdminReview[]> {
  const rows = await sql<AdminReviewRow[]>`
    SELECT reviews.id as id, users.name as author_name, reviews.rating as rating,
           reviews.comment as comment, reviews.trip_id as trip_id,
           trips.from_city as from_city, trips.to_city as to_city,
           trips.type as trip_type
    FROM reviews
    JOIN users ON users.id = reviews.reviewer_id
    JOIN trips ON trips.id = reviews.trip_id
    WHERE 1=1
    ${minRating ? sql`AND reviews.rating >= ${minRating}` : sql``}
    ${tripType ? sql`AND trips.type = ${tripType}` : sql``}
    ORDER BY reviews.id DESC
  `;

  return rows.map((r) => ({
    id: r.id,
    authorName: r.author_name,
    rating: r.rating,
    comment: r.comment,
    tripId: r.trip_id,
    tripRoute: `${r.from_city} → ${r.to_city}`,
    tripType: r.trip_type,
  }));
}

export async function deleteAdminReview(reviewId: number): Promise<boolean> {
  const result = await sql`DELETE FROM reviews WHERE id = ${reviewId}`;

  return result.count > 0;
}

export type AdminReportStatus = "new" | "resolved";

export type AdminReport = {
  id: number;
  category: string;
  description: string | null;
  status: AdminReportStatus;
  reporterName: string;
  tripId: number;
  tripRoute: string;
  createdAt: string;
};

type AdminReportRow = {
  id: number;
  category: string;
  description: string | null;
  status: AdminReportStatus;
  reporter_name: string;
  trip_id: number;
  from_city: string;
  to_city: string;
  created_at: string;
};

export async function listAdminReports(
  status?: AdminReportStatus
): Promise<AdminReport[]> {
  const rows = await sql<AdminReportRow[]>`
    SELECT trip_reports.id as id, trip_reports.category as category,
           trip_reports.description as description, trip_reports.status as status,
           trip_reports.created_at as created_at, users.name as reporter_name,
           trips.id as trip_id, trips.from_city as from_city, trips.to_city as to_city
    FROM trip_reports
    JOIN users ON users.id = trip_reports.reporter_id
    JOIN trips ON trips.id = trip_reports.trip_id
    ${status ? sql`WHERE trip_reports.status = ${status}` : sql``}
    ORDER BY trip_reports.id DESC
  `;

  return rows.map((r) => ({
    id: r.id,
    category: r.category,
    description: r.description,
    status: r.status,
    reporterName: r.reporter_name,
    tripId: r.trip_id,
    tripRoute: `${r.from_city} → ${r.to_city}`,
    createdAt: r.created_at,
  }));
}

export async function resolveReport(reportId: number): Promise<boolean> {
  const result = await sql`
    UPDATE trip_reports SET status = 'resolved' WHERE id = ${reportId}
  `;

  return result.count > 0;
}

const PASSWORD_ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";

function generateTempPassword(length = 10): string {
  const bytes = crypto.randomBytes(length);
  let password = "";

  for (let i = 0; i < length; i++) {
    password += PASSWORD_ALPHABET[bytes[i] % PASSWORD_ALPHABET.length];
  }

  return password;
}

export async function resetUserPassword(userId: number): Promise<string | null> {
  const password = generateTempPassword();
  const passwordHash = await hashPassword(password);

  const result = await sql`
    UPDATE users SET password_hash = ${passwordHash} WHERE id = ${userId}
  `;

  return result.count > 0 ? password : null;
}

export async function deleteAdminUser(userId: number): Promise<boolean> {
  return sql.begin(async (tx) => {
    const ownedTrips = await tx<{ id: number }[]>`
      SELECT id FROM trips WHERE owner_id = ${userId}
    `;
    const ownedTripIds = ownedTrips.map((t) => t.id);

    if (ownedTripIds.length > 0) {
      await tx`DELETE FROM reviews WHERE trip_id = ANY(${ownedTripIds})`;
      await tx`DELETE FROM trip_reports WHERE trip_id = ANY(${ownedTripIds})`;
      await tx`DELETE FROM chat_messages WHERE trip_id = ANY(${ownedTripIds})`;
      await tx`DELETE FROM trip_participants WHERE trip_id = ANY(${ownedTripIds})`;
      await tx`UPDATE taxi_orders SET trip_id = NULL WHERE trip_id = ANY(${ownedTripIds})`;
    }

    await tx`DELETE FROM reviews WHERE reviewer_id = ${userId} OR reviewee_id = ${userId}`;
    await tx`DELETE FROM trip_reports WHERE reporter_id = ${userId}`;
    await tx`DELETE FROM chat_messages WHERE user_id = ${userId}`;
    await tx`DELETE FROM trip_participants WHERE user_id = ${userId}`;
    await tx`DELETE FROM taxi_orders WHERE passenger_id = ${userId} OR driver_id = ${userId}`;

    if (ownedTripIds.length > 0) {
      await tx`DELETE FROM trips WHERE id = ANY(${ownedTripIds})`;
    }

    const result = await tx`DELETE FROM users WHERE id = ${userId}`;

    return result.count > 0;
  });
}
