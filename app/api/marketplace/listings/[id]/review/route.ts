import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";
import { isTrustedOrigin } from "@/lib/security";
import { canReviewListing } from "@/lib/marketplace";
import { createReview, hasReviewedListing } from "@/lib/reviews";

export const runtime = "nodejs";

type Props = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Props) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ canReview: false });
  }

  const { id } = await params;
  const listingId = Number(id);

  if (!Number.isInteger(listingId) || listingId <= 0) {
    return NextResponse.json({ error: "Некорректное объявление" }, { status: 400 });
  }

  const eligibility = await canReviewListing(listingId, user.id);

  if (!eligibility.ok) {
    return NextResponse.json({ canReview: false });
  }

  const already = await hasReviewedListing(listingId, user.id);

  return NextResponse.json({ canReview: !already, alreadyReviewed: already });
}

export async function POST(req: NextRequest, { params }: Props) {
  if (!isTrustedOrigin(req)) {
    return NextResponse.json({ error: "Недопустимый источник запроса" }, { status: 403 });
  }

  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Войдите в аккаунт" }, { status: 401 });
  }

  const { id } = await params;
  const listingId = Number(id);

  if (!Number.isInteger(listingId) || listingId <= 0) {
    return NextResponse.json({ error: "Некорректное объявление" }, { status: 400 });
  }

  const limit = rateLimit(`marketplace-review:${user.id}`, { limit: 10, windowMs: 60_000 });

  if (!limit.allowed) {
    return NextResponse.json({ error: "Слишком много запросов" }, { status: 429 });
  }

  const eligibility = await canReviewListing(listingId, user.id);

  if (!eligibility.ok) {
    return NextResponse.json(
      { error: "Отзыв можно оставить только после подтверждённой обеими сторонами сделки" },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => null);
  const rating = Number(body?.rating);
  const comment = typeof body?.comment === "string" ? body.comment.trim().slice(0, 500) : "";

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Оценка должна быть от 1 до 5" }, { status: 400 });
  }

  const result = await createReview({
    listingId,
    reviewerId: user.id,
    revieweeId: eligibility.otherUserId,
    rating,
    comment: comment || undefined,
  });

  if (!result.ok) {
    return NextResponse.json({ error: "Вы уже оставили отзыв по этой сделке" }, { status: 409 });
  }

  return NextResponse.json({ ok: true });
}
