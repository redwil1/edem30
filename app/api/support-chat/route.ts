import { NextRequest, NextResponse } from "next/server";

import { answerFaqQuestion } from "@/lib/faqBot";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp, isTrustedOrigin } from "@/lib/security";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

const MAX_MESSAGE_LENGTH = 500;

export async function POST(req: NextRequest) {
  if (!isTrustedOrigin(req)) {
    return NextResponse.json(
      { error: "Недопустимый источник запроса" },
      { status: 403 }
    );
  }

  const user = await getCurrentUser();
  const ip = getClientIp(req);

  const limit = rateLimit(`support-chat:${user?.id ?? ip}`, {
    limit: 30,
    windowMs: 10 * 60_000,
  });

  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Слишком много сообщений. Попробуйте через несколько минут." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);

  const message =
    typeof body?.message === "string" ? body.message.trim().slice(0, MAX_MESSAGE_LENGTH) : "";

  if (!message) {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const answer = answerFaqQuestion(message);

  return NextResponse.json({ reply: answer.text, matched: answer.matched });
}
