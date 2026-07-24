import { NextRequest, NextResponse } from "next/server";

import { sql } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isTrustedOrigin } from "@/lib/security";

export const runtime = "nodejs";

const STAFF_ROLES = new Set(["admin", "moderator"]);

type Props = {
  params: Promise<{ id: string; messageId: string }>;
};

export async function DELETE(req: NextRequest, { params }: Props) {
  if (!isTrustedOrigin(req)) {
    return NextResponse.json({ error: "Недопустимый источник запроса" }, { status: 403 });
  }

  const user = await getCurrentUser();

  if (!user || !STAFF_ROLES.has(user.role)) {
    return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });
  }

  const { id, messageId } = await params;
  const tripId = Number(id);
  const msgId = Number(messageId);

  if (!Number.isInteger(tripId) || tripId <= 0 || !Number.isInteger(msgId) || msgId <= 0) {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const result = await sql`
    DELETE FROM chat_messages WHERE id = ${msgId} AND trip_id = ${tripId}
  `;

  if (result.count === 0) {
    return NextResponse.json({ error: "Сообщение не найдено" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
