import { NextRequest, NextResponse } from "next/server";

import { requireAdmin, updateAdminTrip } from "@/lib/admin";
import { isTrustedOrigin } from "@/lib/security";

export const runtime = "nodejs";

type Props = {
  params: Promise<{ id: string }>;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function PATCH(req: NextRequest, { params }: Props) {
  if (!isTrustedOrigin(req)) {
    return NextResponse.json(
      { error: "Недопустимый источник запроса" },
      { status: 403 }
    );
  }

  const admin = await requireAdmin();

  if (!admin) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const { id } = await params;
  const tripId = Number(id);

  if (!Number.isInteger(tripId) || tripId <= 0) {
    return NextResponse.json({ error: "Некорректная поездка" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);

  const input: { price?: number; date?: string } = {};

  if (body?.price !== undefined) {
    const price = Number(body.price);

    if (!Number.isInteger(price) || price <= 0 || price > 100_000) {
      return NextResponse.json({ error: "Укажите корректную цену" }, { status: 400 });
    }

    input.price = price;
  }

  if (body?.date !== undefined) {
    if (typeof body.date !== "string" || !DATE_RE.test(body.date)) {
      return NextResponse.json({ error: "Укажите корректную дату" }, { status: 400 });
    }

    input.date = body.date;
  }

  const ok = updateAdminTrip(tripId, input);

  if (!ok) {
    return NextResponse.json({ error: "Не удалось обновить поездку" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
