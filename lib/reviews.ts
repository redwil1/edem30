import "server-only";

import { db } from "@/lib/db";

export type RatingStats = {
  average: number;
  count: number;
};

export function getUserRatingStats(userId: number): RatingStats {
  const row = db
    .prepare(
      `SELECT AVG(rating) as average, COUNT(*) as count
       FROM reviews
       WHERE reviewee_id = ?`
    )
    .get(userId) as { average: number | null; count: number };

  return {
    average: row.average ? Math.round(row.average * 10) / 10 : 0,
    count: row.count,
  };
}

export function hasReviewed(tripId: number, reviewerId: number): boolean {
  const row = db
    .prepare("SELECT 1 FROM reviews WHERE trip_id = ? AND reviewer_id = ?")
    .get(tripId, reviewerId);

  return !!row;
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

export function createReview(input: CreateReviewInput): CreateReviewResult {
  try {
    db.prepare(
      `INSERT INTO reviews (trip_id, reviewer_id, reviewee_id, rating, comment)
       VALUES (@tripId, @reviewerId, @revieweeId, @rating, @comment)`
    ).run({
      tripId: input.tripId,
      reviewerId: input.reviewerId,
      revieweeId: input.revieweeId,
      rating: input.rating,
      comment: input.comment ?? null,
    });

    return { ok: true };
  } catch {
    return { ok: false, reason: "duplicate" };
  }
}
