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
