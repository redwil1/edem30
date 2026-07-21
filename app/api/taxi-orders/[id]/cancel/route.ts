import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";
import { isTrustedOrigin } from "@/lib/security";
import { cancelOrder } from "@/lib/taxiOrders";

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

  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Войдите в аккаунт" }, { status: 401 });
  }

  const limit = rateLimit(`order-cancel:${user.id}`, { limit: 20, windowMs: 60_000 });

  if (!limit.allowed) {
    return NextResponse.json({ error: "Слишком много запросов" }, { status: 429 });
  }

  const { id } = await params;
  const orderId = Number(id);

  if (!Number.isInteger(orderId) || orderId <= 0) {
    return NextResponse.json({ error: "Некорректный заказ" }, { status: 400 });
  }

  const cancelled = await cancelOrder(orderId, user.id);

  if (!cancelled) {
    return NextResponse.json(
      { error: "Заказ не найден или уже обработан" },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true });
}
