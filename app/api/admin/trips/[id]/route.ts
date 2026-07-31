import { NextRequest, NextResponse } from "next/server";

import { requireAdmin, updateAdminTrip } from "@/lib/admin";
import { rateLimit } from "@/lib/rateLimit";
import { isTrustedOrigin } from "@/lib/security";

export const runtime = "nodejs";

type Props = {
  params: Promise<{ id: string }>;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

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

  const limit = rateLimit(`admin-trips:${admin.id}`, { limit: 30, windowMs: 60_000 });

  if (!limit.allowed) {
    return NextResponse.json({ error: "Слишком много запросов" }, { status: 429 });
  }

  const { id } = await params;
  const tripId = Number(id);

  if (!Number.isInteger(tripId) || tripId <= 0) {
    return NextResponse.json({ error: "Некорректная поездка" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);

  const input: { price?: number; date?: string; from?: string; to?: string; time?: string } = {};

  if (body?.price !== undefined) {
    const price = Number(body.price);

    // 0 допустим — так у формирующихся поездок ("Ищет водителя"), у которых
    // цена ещё не назначена (её выставляет водитель при принятии заявки).
    if (!Number.isInteger(price) || price < 0 || price > 100_000) {
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

  if (body?.from !== undefined) {
    const from = typeof body.from === "string" ? body.from.trim() : "";
    if (!from || from.length > 80) {
      return NextResponse.json({ error: "Укажите корректный город отправления" }, { status: 400 });
    }
    input.from = from;
  }

  if (body?.to !== undefined) {
    const to = typeof body.to === "string" ? body.to.trim() : "";
    if (!to || to.length > 80) {
      return NextResponse.json({ error: "Укажите корректный город назначения" }, { status: 400 });
    }
    input.to = to;
  }

  if (body?.time !== undefined) {
    if (typeof body.time !== "string" || !TIME_RE.test(body.time)) {
      return NextResponse.json({ error: "Укажите корректное время" }, { status: 400 });
    }
    input.time = body.time;
  }

  const ok = await updateAdminTrip(tripId, input);

  if (!ok) {
    return NextResponse.json({ error: "Не удалось обновить поездку" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
