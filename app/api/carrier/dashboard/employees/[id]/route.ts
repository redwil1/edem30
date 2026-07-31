import { NextRequest, NextResponse } from "next/server";

import { isTrustedOrigin } from "@/lib/security";
import { removeEmployee, requireCarrierOperator } from "@/lib/carriers";

export const runtime = "nodejs";

type Props = {
  params: Promise<{ id: string }>;
};

export async function DELETE(req: NextRequest, { params }: Props) {
  if (!isTrustedOrigin(req)) {
    return NextResponse.json({ error: "Недопустимый источник запроса" }, { status: 403 });
  }

  const operator = await requireCarrierOperator();
  if (!operator || operator.role !== "manager") {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const { id } = await params;
  const employeeId = Number(id);

  if (!Number.isInteger(employeeId) || employeeId <= 0) {
    return NextResponse.json({ error: "Некорректный сотрудник" }, { status: 400 });
  }

  const result = await removeEmployee(operator.carrier.id, employeeId);
  if (!result.ok) {
    return NextResponse.json({ error: "Сотрудник не найден" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, freedRides: result.freedRides });
}
