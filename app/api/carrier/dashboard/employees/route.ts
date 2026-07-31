import { NextRequest, NextResponse } from "next/server";

import { isTrustedOrigin } from "@/lib/security";
import { assignEmployee, listEmployees, requireCarrierOperator } from "@/lib/carriers";

export const runtime = "nodejs";

export async function GET() {
  const operator = await requireCarrierOperator();
  if (!operator || operator.role !== "manager") {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const employees = await listEmployees(operator.carrier.id);

  return NextResponse.json({ employees }, { headers: { "Cache-Control": "no-store" } });
}

const VALID_ROLES = new Set(["manager", "operator", "driver"]);

export async function POST(req: NextRequest) {
  if (!isTrustedOrigin(req)) {
    return NextResponse.json({ error: "Недопустимый источник запроса" }, { status: 403 });
  }

  const operator = await requireCarrierOperator();
  if (!operator || operator.role !== "manager") {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);

  const userId = Number(body?.userId);
  const role = typeof body?.role === "string" ? body.role : "";

  if (!Number.isInteger(userId) || userId <= 0) {
    return NextResponse.json({ error: "Выберите пользователя" }, { status: 400 });
  }
  if (!VALID_ROLES.has(role)) {
    return NextResponse.json({ error: "Некорректная роль" }, { status: 400 });
  }

  const result = await assignEmployee(operator.carrier.id, userId, role as "manager" | "operator" | "driver");

  if (!result.ok) {
    const messages: Record<typeof result.reason, string> = {
      user_not_found: "Пользователь не найден",
      already_linked_elsewhere: "Этот пользователь уже привязан к другому перевозчику",
    };
    return NextResponse.json({ error: messages[result.reason] }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
