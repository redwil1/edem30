import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin";
import { getBonusTripDetail } from "@/lib/driverBonuses";

export const runtime = "nodejs";

type Props = {
  params: Promise<{ tripId: string }>;
};

export async function GET(_req: Request, { params }: Props) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const { tripId } = await params;
  const id = Number(tripId);

  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Некорректная поездка" }, { status: 400 });
  }

  const detail = await getBonusTripDetail(id);

  if (!detail) {
    return NextResponse.json({ error: "Поездка не найдена" }, { status: 404 });
  }

  return NextResponse.json(detail, { headers: { "Cache-Control": "no-store" } });
}
