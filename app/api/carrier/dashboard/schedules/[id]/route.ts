import { NextRequest, NextResponse } from "next/server";

import { isTrustedOrigin } from "@/lib/security";
import { requireCarrierOperator, setScheduleActive } from "@/lib/carriers";

export const runtime = "nodejs";

type Props = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: NextRequest, { params }: Props) {
  if (!isTrustedOrigin(req)) {
    return NextResponse.json({ error: "Недопустимый источник запроса" }, { status: 403 });
  }

  const operator = await requireCarrierOperator();
  if (!operator) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const { id } = await params;
  const scheduleId = Number(id);

  if (!Number.isInteger(scheduleId) || scheduleId <= 0) {
    return NextResponse.json({ error: "Некорректное расписание" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  if (typeof body?.active !== "boolean") {
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  }

  await setScheduleActive(operator.carrier.id, scheduleId, body.active);

  return NextResponse.json({ ok: true });
}
