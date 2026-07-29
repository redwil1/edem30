import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getRideRequest, hasDriverResponded, recordResponse } from "@/lib/rideRequests";
import { getOrCreateDirectConversation } from "@/lib/conversations";
import { rateLimit } from "@/lib/rateLimit";
import { isTrustedOrigin } from "@/lib/security";
import { sendPushToUser } from "@/lib/push";

export const runtime = "nodejs";

type Props = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Props) {
  if (!isTrustedOrigin(req)) {
    return NextResponse.json({ error: "Недопустимый источник запроса" }, { status: 403 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Войдите, чтобы откликнуться" }, { status: 401 });
  }

  const { id } = await params;
  const requestId = Number(id);
  if (!Number.isInteger(requestId) || requestId <= 0) {
    return NextResponse.json({ error: "Некорректная заявка" }, { status: 400 });
  }

  const request = await getRideRequest(requestId);
  if (!request || request.status !== "open") {
    return NextResponse.json({ error: "Заявка не найдена или уже закрыта" }, { status: 404 });
  }

  if (request.passengerId === user.id) {
    return NextResponse.json({ error: "Нельзя откликнуться на свою заявку" }, { status: 400 });
  }

  const limit = rateLimit(`ride-request-respond:${user.id}`, { limit: 30, windowMs: 60_000 });
  if (!limit.allowed) {
    return NextResponse.json({ error: "Слишком много запросов" }, { status: 429 });
  }

  const alreadyResponded = await hasDriverResponded(requestId, user.id);

  const conversationId = await getOrCreateDirectConversation(user.id, request.passengerId);
  await recordResponse(requestId, user.id, conversationId);

  if (!alreadyResponded) {
    sendPushToUser(request.passengerId, {
      title: "Водитель откликнулся на вашу заявку",
      body: `${user.name}: ${request.from} → ${request.to}`,
      url: `/find-driver/${requestId}`,
    });
  }

  return NextResponse.json({ conversationId });
}
