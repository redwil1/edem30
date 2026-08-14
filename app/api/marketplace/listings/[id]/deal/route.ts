import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { isTrustedOrigin } from "@/lib/security";
import { confirmDeal } from "@/lib/marketplace";

export const runtime = "nodejs";

type Props = { params: Promise<{ id: string }> };

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

  const result = await confirmDeal(listingId, user.id);

  if (!result.ok) {
    const messages: Record<typeof result.reason, [string, number]> = {
      not_found: ["Объявление не найдено", 404],
      not_sold: ["Сначала пометьте объявление как проданное", 409],
      already_matched_other: ["Сделка уже подтверждена с другим участником", 409],
      not_participant: ["Подтвердить сделку может только тот, кто переписывался с продавцом", 403],
    };

    const [error, status] = messages[result.reason];
    return NextResponse.json({ error }, { status });
  }

  return NextResponse.json({ ok: true, matched: result.matched });
}
