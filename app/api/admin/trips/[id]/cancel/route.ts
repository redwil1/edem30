import { NextRequest, NextResponse } from "next/server";

import { adminCancelTrip, requireAdmin } from "@/lib/admin";
import { isTrustedOrigin } from "@/lib/security";

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

  const admin = await requireAdmin();

  if (!admin) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const { id } = await params;
  const tripId = Number(id);

  if (!Number.isInteger(tripId) || tripId <= 0) {
    return NextResponse.json({ error: "Некорректная поездка" }, { status: 400 });
  }

  const ok = await adminCancelTrip(tripId);

  if (!ok) {
    return NextResponse.json({ error: "Поездка не найдена" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
