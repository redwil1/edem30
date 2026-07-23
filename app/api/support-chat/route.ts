import { NextRequest, NextResponse } from "next/server";

import { askSupportBot, ChatMessage, isSupportBotConfigured } from "@/lib/supportBot";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp, isTrustedOrigin } from "@/lib/security";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

const MAX_MESSAGES = 12;
const MAX_MESSAGE_LENGTH = 500;

export async function POST(req: NextRequest) {
  if (!isTrustedOrigin(req)) {
    return NextResponse.json(
      { error: "Недопустимый источник запроса" },
      { status: 403 }
    );
  }

  if (!isSupportBotConfigured()) {
    return NextResponse.json(
      {
        error:
          "Чат поддержки временно недоступен. Напишите нам на support@edem30.ru или в Telegram @edem30_support.",
      },
      { status: 503 }
    );
  }

  const user = await getCurrentUser();
  const ip = getClientIp(req);

  const limit = rateLimit(`support-chat:${user?.id ?? ip}`, {
    limit: 15,
    windowMs: 10 * 60_000,
  });

  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Слишком много сообщений. Попробуйте через несколько минут." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);

  const rawHistory = Array.isArray(body?.messages) ? body.messages : [];

  if (rawHistory.length === 0 || rawHistory.length > MAX_MESSAGES) {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const history: ChatMessage[] = [];

  for (const m of rawHistory) {
    const role = m?.role === "assistant" ? "assistant" : "user";
    const text = typeof m?.text === "string" ? m.text.trim().slice(0, MAX_MESSAGE_LENGTH) : "";

    if (!text) {
      return NextResponse.json({ error: "Некорректное сообщение" }, { status: 400 });
    }

    history.push({ role, text });
  }

  if (history[history.length - 1].role !== "user") {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  try {
    const reply = await askSupportBot(history);

    return NextResponse.json({ reply });
  } catch {
    return NextResponse.json(
      { error: "Не удалось получить ответ. Попробуйте ещё раз." },
      { status: 502 }
    );
  }
}
