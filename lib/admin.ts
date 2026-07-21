import "server-only";

import { db } from "@/lib/db";
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
};

export function getAdminStats(): AdminStats {
  const usersCount = (
    db.prepare("SELECT COUNT(*) as c FROM users").get() as { c: number }
  ).c;

  const tripsCount = (
    db.prepare("SELECT COUNT(*) as c FROM trips").get() as { c: number }
  ).c;

  const reviewsCount = (
    db.prepare("SELECT COUNT(*) as c FROM reviews").get() as { c: number }
  ).c;

  return { usersCount, tripsCount, reviewsCount };
}

export type AdminUser = {
  id: number;
  name: string;
  phone: string;
  role: UserRole;
  createdAt: string;
};

export function listAdminUsers(search?: string): AdminUser[] {
  const rows = search
    ? (db
        .prepare(
          `SELECT id, name, phone, role, created_at as createdAt
           FROM users WHERE name LIKE ? ORDER BY id DESC`
        )
        .all(`%${search}%`) as AdminUser[])
    : (db
        .prepare(
          "SELECT id, name, phone, role, created_at as createdAt FROM users ORDER BY id DESC"
        )
        .all() as AdminUser[]);

  return rows;
}

const ASSIGNABLE_ROLES: UserRole[] = ["passenger", "driver", "admin"];

export function setAdminUserRole(userId: number, role: string): boolean {
  if (!ASSIGNABLE_ROLES.includes(role as UserRole)) return false;

  const result = db
    .prepare("UPDATE users SET role = ? WHERE id = ?")
    .run(role, userId);

  return result.changes > 0;
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

const ADMIN_TRIP_SELECT = `
  SELECT id, from_city, to_city, trip_date, trip_time, price, driver_name,
         cancelled_at, driver_confirmed_at, passenger_confirmed_at,
         driver_completed_at, passenger_completed_at
  FROM trips
`;

export function listAdminTrips(search?: string): AdminTrip[] {
  const rows = search
    ? (db
        .prepare(
          `${ADMIN_TRIP_SELECT} WHERE from_city LIKE ? OR to_city LIKE ? ORDER BY id DESC`
        )
        .all(`%${search}%`, `%${search}%`) as AdminTripRow[])
    : (db.prepare(`${ADMIN_TRIP_SELECT} ORDER BY id DESC`).all() as AdminTripRow[]);

  return rows.map(toAdminTrip);
}

export type UpdateAdminTripInput = {
  price?: number;
  date?: string;
};

export function updateAdminTrip(
  tripId: number,
  input: UpdateAdminTripInput
): boolean {
  if (input.price === undefined && input.date === undefined) return false;

  const sets: string[] = [];
  const params: Record<string, unknown> = { id: tripId };

  if (input.price !== undefined) {
    sets.push("price = @price");
    params.price = input.price;
  }

  if (input.date !== undefined) {
    sets.push("trip_date = @date");
    params.date = input.date;
  }

  const result = db
    .prepare(`UPDATE trips SET ${sets.join(", ")} WHERE id = @id`)
    .run(params);

  return result.changes > 0;
}

export function adminCancelTrip(tripId: number): boolean {
  const result = db
    .prepare(
      "UPDATE trips SET cancelled_at = COALESCE(cancelled_at, datetime('now')) WHERE id = ?"
    )
    .run(tripId);

  db.prepare(
    "UPDATE taxi_orders SET status = 'cancelled' WHERE trip_id = ? AND status != 'cancelled'"
  ).run(tripId);

  return result.changes > 0;
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

const ADMIN_REVIEW_SELECT = `
  SELECT reviews.id as id, users.name as author_name, reviews.rating as rating,
         reviews.comment as comment, reviews.trip_id as trip_id,
         trips.from_city as from_city, trips.to_city as to_city
  FROM reviews
  JOIN users ON users.id = reviews.reviewer_id
  JOIN trips ON trips.id = reviews.trip_id
`;

export function listAdminReviews(minRating?: number): AdminReview[] {
  const rows = minRating
    ? (db
        .prepare(`${ADMIN_REVIEW_SELECT} WHERE reviews.rating >= ? ORDER BY reviews.id DESC`)
        .all(minRating) as AdminReviewRow[])
    : (db
        .prepare(`${ADMIN_REVIEW_SELECT} ORDER BY reviews.id DESC`)
        .all() as AdminReviewRow[]);

  return rows.map((r) => ({
    id: r.id,
    authorName: r.author_name,
    rating: r.rating,
    comment: r.comment,
    tripId: r.trip_id,
    tripRoute: `${r.from_city} → ${r.to_city}`,
  }));
}

export function deleteAdminReview(reviewId: number): boolean {
  const result = db.prepare("DELETE FROM reviews WHERE id = ?").run(reviewId);

  return result.changes > 0;
}
