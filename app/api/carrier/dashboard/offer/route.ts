import { NextRequest, NextResponse } from "next/server";

import { rateLimit } from "@/lib/rateLimit";
import { isTrustedOrigin } from "@/lib/security";
import { findMatchingRideRequestClusters, offerRideToCluster, requireCarrierOperator } from "@/lib/carriers";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!isTrustedOrigin(req)) {
    return NextResponse.json({ error: "Недопустимый источник запроса" }, { status: 403 });
  }

  const operator = await requireCarrierOperator();
  if (!operator) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const limit = rateLimit(`carrier-offer:${operator.userId}`, { limit: 60, windowMs: 60 * 60_000 });
  if (!limit.allowed) {
    return NextResponse.json({ error: "Слишком много запросов" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const carrierRideId = Number(body?.carrierRideId);

  if (!Number.isInteger(carrierRideId) || carrierRideId <= 0) {
    return NextResponse.json({ error: "Некорректный рейс" }, { status: 400 });
  }

  // Пересчитываем подходящие кластеры заявок на сервере — не доверяем
  // клиенту содержимое кластера, только id рейса, под который предлагаем места.
  const matches = await findMatchingRideRequestClusters(operator.carrier.id);
  const match = matches.find((m) => m.carrierRide.id === carrierRideId);

  if (!match) {
    return NextResponse.json({ error: "Подходящая заявка не найдена" }, { status: 404 });
  }

  const notified = await offerRideToCluster(carrierRideId, match.cluster);

  return NextResponse.json({ ok: true, notified });
}
