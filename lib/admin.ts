import "server-only";

import { sql } from "@/lib/db";
import { getCurrentUser, UserRole } from "@/lib/auth";

export async function requireAdmin() {
  const user = await getCurrentUser();

  if (!user || user.role !== "admin") return null;

  return user;
}

export type AdminStats = {
  usersCount: number;
  tripsCount: number;
  reviewsCount: number;
  newReportsCount: number;
};

export async function getAdminStats(): Promise<AdminStats> {
  const [users, trips, reviews, reports] = await Promise.all([
    sql<{ c: string }[]>`SELECT COUNT(*) as c FROM users`,
    sql<{ c: string }[]>`SELECT COUNT(*) as c FROM trips`,
    sql<{ c: string }[]>`SELECT COUNT(*) as c FROM reviews`,
    sql<{ c: string }[]>`SELECT COUNT(*) as c FROM trip_reports WHERE status = 'new'`,
  ]);

  return {
    usersCount: Number(users[0].c),
    tripsCount: Number(trips[0].c),
    reviewsCount: Number(reviews[0].c),
    newReportsCount: Number(reports[0].c),
  };
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
};

type AdminReviewRow = {
  id: number;
  author_name: string;
  rating: number;
  comment: string | null;
  trip_id: number;
  from_city: string;
  to_city: string;
};

export async function listAdminReviews(minRating?: number): Promise<AdminReview[]> {
  const rows = await sql<AdminReviewRow[]>`
    SELECT reviews.id as id, users.name as author_name, reviews.rating as rating,
           reviews.comment as comment, reviews.trip_id as trip_id,
           trips.from_city as from_city, trips.to_city as to_city
    FROM reviews
    JOIN users ON users.id = reviews.reviewer_id
    JOIN trips ON trips.id = reviews.trip_id
    ${minRating ? sql`WHERE reviews.rating >= ${minRating}` : sql``}
    ORDER BY reviews.id DESC
  `;

  return rows.map((r) => ({
    id: r.id,
    authorName: r.author_name,
    rating: r.rating,
    comment: r.comment,
    tripId: r.trip_id,
    tripRoute: `${r.from_city} → ${r.to_city}`,
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
