import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin";
import { rateLimit } from "@/lib/rateLimit";
import { isTrustedOrigin } from "@/lib/security";
import { BonusStatus, setTripBonusesStatus } from "@/lib/driverBonuses";

export const runtime = "nodejs";

type Props = {
  params: Promise<{ tripId: string }>;
};

const ALLOWED: Exclude<BonusStatus, "pending">[] = ["approved", "paid", "rejected"];

export async function POST(req: NextRequest, { params }: Props) {
  if (!isTrustedOrigin(req)) {
    return NextResponse.json({ error: "Недопустимый источник запроса" }, { status: 403 });
  }

  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const limit = rateLimit(`driver-bonus-trip-status:${admin.id}`, { limit: 60, windowMs: 60_000 });
  if (!limit.allowed) {
    return NextResponse.json({ error: "Слишком много запросов" }, { status: 429 });
  }

  const { tripId } = await params;
  const id = Number(tripId);

  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Некорректная поездка" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const status = body?.status;

  if (!ALLOWED.includes(status)) {
    return NextResponse.json({ error: "Некорректный статус" }, { status: 400 });
  }

  const result = await setTripBonusesStatus(id, status, admin.id);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }

  return NextResponse.json({ ok: true, updated: result.updated });
}
