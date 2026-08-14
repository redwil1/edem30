import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";
import { isTrustedOrigin } from "@/lib/security";
import { getOrCreateDirectConversation } from "@/lib/conversations";
import { getListingOwnerId, linkConversationToListing } from "@/lib/marketplace";

export const runtime = "nodejs";

type Props = { params: Promise<{ id: string }> };

/** «Написать продавцу» — существующий direct-чат, просто помечаем контекст объявления. */
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

  const limit = rateLimit(`marketplace-contact:${user.id}`, { limit: 20, windowMs: 60_000 });

  if (!limit.allowed) {
    return NextResponse.json({ error: "Слишком много запросов" }, { status: 429 });
  }

  const ownerId = await getListingOwnerId(listingId);

  if (!ownerId) {
    return NextResponse.json({ error: "Объявление не найдено" }, { status: 404 });
  }

  if (ownerId === user.id) {
    return NextResponse.json({ error: "Это ваше объявление" }, { status: 400 });
  }

  const conversationId = await getOrCreateDirectConversation(user.id, ownerId);

  await linkConversationToListing(conversationId, listingId);

  return NextResponse.json({ conversationId });
}
