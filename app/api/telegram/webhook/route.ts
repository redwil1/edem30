import { NextRequest, NextResponse } from "next/server";

import { handleTelegramUpdate } from "@/lib/telegramBot";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-telegram-bot-api-secret-token");

  if (!process.env.TELEGRAM_WEBHOOK_SECRET || secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Недопустимый источник запроса" }, { status: 403 });
  }

  const update = await req.json().catch(() => null);

  if (update) {
    await handleTelegramUpdate(update).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
