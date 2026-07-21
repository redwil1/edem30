import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";
import { isTrustedOrigin } from "@/lib/security";
import { getTripLifecycle, getTripOwnerId, isTripParticipant } from "@/lib/trips";
import { createReview, hasReviewed } from "@/lib/reviews";

export const runtime = "nodejs";

type Props = {
  params: Promise<{ id: string }>;
};

export async function POST(req: NextRequest, { params }: Props) {
  if (!isTrustedOrigin(req)) {
    return NextResponse.json(
      { error: "Недопустимый источник запроса" },
      { status: 403 }
    );
  }

  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Войдите в аккаунт" }, { status: 401 });
  }

  const limit = rateLimit(`review:${user.id}`, {
    limit: 20,
    windowMs: 60 * 60_000,
  });

  if (!limit.allowed) {
    return NextResponse.json({ error: "Слишком много запросов" }, { status: 429 });
  }

  const { id } = await params;
  const tripId = Number(id);

  if (!Number.isInteger(tripId) || tripId <= 0) {
    return NextResponse.json({ error: "Некорректная поездка" }, { status: 400 });
  }

  const ownerId = getTripOwnerId(tripId);

  if (!ownerId) {
    return NextResponse.json({ error: "Поездка не найдена" }, { status: 404 });
  }

  const isDriver = ownerId === user.id;
  const isPassenger = isTripParticipant(tripId, user.id);

  if (!isDriver && !isPassenger) {
    return NextResponse.json(
      { error: "Отзыв можно оставить только после участия в поездке" },
      { status: 403 }
    );
  }

  if (!getTripLifecycle(tripId).completed) {
    return NextResponse.json(
      { error: "Отзыв можно оставить только после завершения поездки" },
      { status: 409 }
    );
  }

  const body = await req.json().catch(() => null);

  let revieweeId: number;

  if (isDriver) {
    const candidate = Number(body?.revieweeId);

    if (!Number.isInteger(candidate) || !isTripParticipant(tripId, candidate)) {
      return NextResponse.json(
        { error: "Укажите пассажира для отзыва" },
        { status: 400 }
      );
    }

    revieweeId = candidate;
  } else {
    revieweeId = ownerId;
  }

  if (revieweeId === user.id) {
    return NextResponse.json(
      { error: "Нельзя оставить отзыв самому себе" },
      { status: 400 }
    );
  }

  if (hasReviewed(tripId, user.id)) {
    return NextResponse.json(
      { error: "Вы уже оставили отзыв на эту поездку" },
      { status: 409 }
    );
  }

  const rating = Number(body?.rating);
  const comment =
    typeof body?.comment === "string" ? body.comment.trim().slice(0, 500) : "";

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json(
      { error: "Оценка должна быть от 1 до 5" },
      { status: 400 }
    );
  }

  const result = createReview({
    tripId,
    reviewerId: user.id,
    revieweeId,
    rating,
    comment: comment || undefined,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: "Вы уже оставили отзыв на эту поездку" },
      { status: 409 }
    );
  }

  return NextResponse.json({ ok: true });
}
