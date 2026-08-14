import { NextRequest, NextResponse } from "next/server";

import { requireStaff } from "@/lib/admin";
import { isTrustedOrigin } from "@/lib/security";
import { adminSetListingStatus } from "@/lib/marketplace";

export const runtime = "nodejs";

type Props = { params: Promise<{ id: string }> };

/** Скрыть объявление (архивировать) — модерация, не hard delete. */
export async function DELETE(req: NextRequest, { params }: Props) {
  if (!isTrustedOrigin(req)) {
    return NextResponse.json({ error: "Недопустимый источник запроса" }, { status: 403 });
  }

  const staff = await requireStaff();

  if (!staff) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const { id } = await params;
  const listingId = Number(id);

  if (!Number.isInteger(listingId) || listingId <= 0) {
    return NextResponse.json({ error: "Некорректное объявление" }, { status: 400 });
  }

  const updated = await adminSetListingStatus(listingId, "archived");

  if (!updated) {
    return NextResponse.json({ error: "Объявление не найдено" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
