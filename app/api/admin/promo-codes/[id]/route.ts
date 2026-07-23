import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin";
import { deletePromoCode, setPromoCodeActive } from "@/lib/promoCodes";
import { rateLimit } from "@/lib/rateLimit";
import { isTrustedOrigin } from "@/lib/security";

export const runtime = "nodejs";

type Props = {
  params: Promise<{ id: string }>;
};

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

  const limit = rateLimit(`admin-promo-patch:${admin.id}`, { limit: 30, windowMs: 60_000 });

  if (!limit.allowed) {
    return NextResponse.json({ error: "Слишком много запросов" }, { status: 429 });
  }

  const { id } = await params;
  const codeId = Number(id);

  if (!Number.isInteger(codeId) || codeId <= 0) {
    return NextResponse.json({ error: "Некорректный код" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const active = Boolean(body?.active);

  const ok = await setPromoCodeActive(codeId, active);

  if (!ok) {
    return NextResponse.json({ error: "Не удалось изменить код" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: Props) {
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
  const codeId = Number(id);

  if (!Number.isInteger(codeId) || codeId <= 0) {
    return NextResponse.json({ error: "Некорректный код" }, { status: 400 });
  }

  const ok = await deletePromoCode(codeId);

  if (!ok) {
    return NextResponse.json({ error: "Не удалось удалить код" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
