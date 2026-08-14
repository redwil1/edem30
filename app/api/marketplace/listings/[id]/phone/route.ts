import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";
import { getSellerPhoneIfConfirmed } from "@/lib/marketplace";

export const runtime = "nodejs";

type Props = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Props) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Войдите, чтобы увидеть номер" }, { status: 401 });
  }

  const limit = rateLimit(`marketplace-phone:${user.id}`, { limit: 30, windowMs: 60_000 });

  if (!limit.allowed) {
    return NextResponse.json({ error: "Слишком много запросов" }, { status: 429 });
  }

  const { id } = await params;
  const listingId = Number(id);

  if (!Number.isInteger(listingId) || listingId <= 0) {
    return NextResponse.json({ error: "Некорректное объявление" }, { status: 400 });
  }

  const phone = await getSellerPhoneIfConfirmed(listingId);

  if (!phone) {
    return NextResponse.json({ error: "Номер недоступен" }, { status: 404 });
  }

  return NextResponse.json({ phone });
}
