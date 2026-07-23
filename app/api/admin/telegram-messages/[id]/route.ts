import { NextRequest, NextResponse } from "next/server";

import { requireStaff } from "@/lib/admin";
import { resolveTelegramMessage } from "@/lib/telegramBot";
import { rateLimit } from "@/lib/rateLimit";
import { isTrustedOrigin } from "@/lib/security";

export const runtime = "nodejs";

type Props = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: NextRequest, { params }: Props) {
  if (!isTrustedOrigin(req)) {
    return NextResponse.json(
      { error: "Недопустимый источник запроса" },
      { status: 403 }
    );
  }

  const admin = await requireStaff();

  if (!admin) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const limit = rateLimit(`admin-tg-resolve:${admin.id}`, { limit: 30, windowMs: 60_000 });

  if (!limit.allowed) {
    return NextResponse.json({ error: "Слишком много запросов" }, { status: 429 });
  }

  const { id } = await params;
  const messageId = Number(id);

  if (!Number.isInteger(messageId) || messageId <= 0) {
    return NextResponse.json({ error: "Некорректное сообщение" }, { status: 400 });
  }

  const ok = await resolveTelegramMessage(messageId);

  if (!ok) {
    return NextResponse.json({ error: "Не удалось отметить сообщение" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
