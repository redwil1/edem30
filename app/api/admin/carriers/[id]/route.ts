import { NextRequest, NextResponse } from "next/server";

import { requireAdmin, setCarrierActive } from "@/lib/admin";
import { isTrustedOrigin } from "@/lib/security";

export const runtime = "nodejs";

type Props = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: NextRequest, { params }: Props) {
  if (!isTrustedOrigin(req)) {
    return NextResponse.json({ error: "Недопустимый источник запроса" }, { status: 403 });
  }

  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const { id } = await params;
  const carrierId = Number(id);

  if (!Number.isInteger(carrierId) || carrierId <= 0) {
    return NextResponse.json({ error: "Некорректный перевозчик" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  if (typeof body?.active !== "boolean") {
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  }

  const ok = await setCarrierActive(carrierId, body.active);
  if (!ok) {
    return NextResponse.json({ error: "Перевозчик не найден" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
