import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";
import { isTrustedOrigin } from "@/lib/security";
import { bumpListing, setListingStatus } from "@/lib/marketplace";

export const runtime = "nodejs";

type Props = { params: Promise<{ id: string }> };

const VALID_STATUSES = ["active", "reserved", "sold", "archived"];

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

  const limit = rateLimit(`marketplace-status:${user.id}`, { limit: 30, windowMs: 60_000 });

  if (!limit.allowed) {
    return NextResponse.json({ error: "Слишком много запросов" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const status = body?.status;

  if (status === "bump") {
    const bumped = await bumpListing(listingId, user.id);

    if (!bumped) {
      return NextResponse.json(
        { error: "Поднимать объявление можно не чаще раза в 24 часа" },
        { status: 429 }
      );
    }

    return NextResponse.json({ ok: true });
  }

  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Некорректный статус" }, { status: 400 });
  }

  const updated = await setListingStatus(listingId, user.id, status);

  if (!updated) {
    return NextResponse.json({ error: "Объявление не найдено или доступ запрещён" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
