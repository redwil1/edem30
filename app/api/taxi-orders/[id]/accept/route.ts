import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";
import { isTrustedOrigin } from "@/lib/security";
import { acceptOrder, TAXI_SERVICE_ENABLED } from "@/lib/taxiOrders";

export const runtime = "nodejs";

type Props = {
  params: Promise<{ id: string }>;
};

export async function POST(req: NextRequest, { params }: Props) {
  if (!TAXI_SERVICE_ENABLED) {
    return NextResponse.json(
      { error: "Сервис такси временно недоступен. Извините за неудобство." },
      { status: 503 }
    );
  }

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

  const limit = rateLimit(`accept-order:${user.id}`, {
    limit: 30,
    windowMs: 60_000,
  });

  if (!limit.allowed) {
    return NextResponse.json({ error: "Слишком много запросов" }, { status: 429 });
  }

  const { id } = await params;
  const orderId = Number(id);

  if (!Number.isInteger(orderId) || orderId <= 0) {
    return NextResponse.json({ error: "Некорректный заказ" }, { status: 400 });
  }

  const result = await acceptOrder(orderId, { id: user.id, name: user.name });

  if (!result.ok) {
    if (result.reason === "self") {
      return NextResponse.json(
        { error: "Нельзя принять собственный заказ" },
        { status: 400 }
      );
    }

    if (result.reason === "vehicle_incomplete") {
      return NextResponse.json(
        {
          error:
            "Заполните данные машины в профиле (тип, марка, номер, цвет), чтобы принимать заказы такси",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Заказ уже принят другим водителем или отменён" },
      { status: 409 }
    );
  }

  return NextResponse.json({ tripId: result.tripId });
}
