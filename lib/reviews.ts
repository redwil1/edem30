import "server-only";

import { sql } from "@/lib/db";

export type RatingStats = {
  average: number;
  count: number;
};

export async function getUserRatingStats(userId: number): Promise<RatingStats> {
  const rows = await sql<{ average: number | null; count: string }[]>`
    SELECT AVG(rating) as average, COUNT(*) as count
    FROM reviews
    WHERE reviewee_id = ${userId}
  `;

  const row = rows[0];

  return {
    average: row.average ? Math.round(row.average * 10) / 10 : 0,
    count: Number(row.count),
  };
}

export async function hasReviewed(
  tripId: number,
  reviewerId: number
): Promise<boolean> {
  const rows = await sql`
    SELECT 1 FROM reviews WHERE trip_id = ${tripId} AND reviewer_id = ${reviewerId}
  `;

  return rows.length > 0;
}

export type UserReview = {
  id: number;
  rating: number;
  comment: string | null;
  createdAt: string;
  tripId: number;
  tripRoute: string;
  authorId: number;
  authorName: string;
  authorAvatarUrl: string | null;
  authorAvatarPreset: string | null;
};

type UserReviewRow = {
  id: number;
  rating: number;
  comment: string | null;
  created_at: string;
  trip_id: number;
  from_city: string;
  to_city: string;
  author_id: number;
  author_name: string;
  author_avatar_url: string | null;
  author_avatar_preset: string | null;
};

export async function listUserReviews(userId: number): Promise<UserReview[]> {
  const rows = await sql<UserReviewRow[]>`
    SELECT reviews.id as id, reviews.rating as rating, reviews.comment as comment,
           reviews.created_at as created_at, reviews.trip_id as trip_id,
           trips.from_city as from_city, trips.to_city as to_city,
           users.id as author_id, users.name as author_name,
           users.avatar_url as author_avatar_url, users.avatar_preset as author_avatar_preset
    FROM reviews
    JOIN users ON users.id = reviews.reviewer_id
    JOIN trips ON trips.id = reviews.trip_id
    WHERE reviews.reviewee_id = ${userId}
    ORDER BY reviews.id DESC
  `;

  return rows.map((r) => ({
    id: r.id,
    rating: r.rating,
    comment: r.comment,
    createdAt: r.created_at,
    tripId: r.trip_id,
    tripRoute: `${r.from_city} → ${r.to_city}`,
    authorId: r.author_id,
    authorName: r.author_name,
    authorAvatarUrl: r.author_avatar_url,
    authorAvatarPreset: r.author_avatar_preset,
  }));
}

export type CreateReviewInput = {
  tripId: number;
  reviewerId: number;
  revieweeId: number;
  rating: number;
  comment?: string;
};

export type CreateReviewResult =
  | { ok: true }
  | { ok: false; reason: "duplicate" };

export async function createReview(
  input: CreateReviewInput
): Promise<CreateReviewResult> {
  try {
    await sql`
      INSERT INTO reviews (trip_id, reviewer_id, reviewee_id, rating, comment)
      VALUES (${input.tripId}, ${input.reviewerId}, ${input.revieweeId}, ${input.rating}, ${input.comment ?? null})
    `;

    return { ok: true };
  } catch {
    return { ok: false, reason: "duplicate" };
  }
}
