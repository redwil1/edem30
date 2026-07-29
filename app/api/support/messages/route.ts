import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import {
  getConversationMessages,
  getSupportConversationBySubject,
  postMessage,
} from "@/lib/conversations";
import { rateLimit } from "@/lib/rateLimit";
import { isTrustedOrigin } from "@/lib/security";
import { sendPushToStaff } from "@/lib/push";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: "Войдите, чтобы писать в поддержку" },
      { status: 401 }
    );
  }

  const conversationId = await getSupportConversationBySubject(user.id);

  if (!conversationId) {
    return NextResponse.json(
      { conversationExists: false, messages: [] },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  const rows = await getConversationMessages(conversationId);

  return NextResponse.json(
    {
      conversationExists: true,
      messages: rows.map((m) => ({
        id: m.id,
        text: m.text,
        createdAt: m.createdAt,
        isYou: m.senderId === user.id,
        isStaff: m.senderRole === "admin" || m.senderRole === "moderator",
      })),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(req: NextRequest) {
  if (!isTrustedOrigin(req)) {
    return NextResponse.json(
      { error: "Недопустимый источник запроса" },
      { status: 403 }
    );
  }

  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: "Войдите, чтобы писать в поддержку" },
      { status: 401 }
    );
  }

  const conversationId = await getSupportConversationBySubject(user.id);

  if (!conversationId) {
    return NextResponse.json(
      {
        error:
          "Пока нет диалога с поддержкой. Дождитесь, пока администратор напишет вам первым.",
      },
      { status: 403 }
    );
  }

  const limit = rateLimit(`support-message:${user.id}`, {
    limit: 20,
    windowMs: 60_000,
  });

  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Слишком много сообщений. Подождите немного." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim() : "";

  if (!text) {
    return NextResponse.json({ error: "Пустое сообщение" }, { status: 400 });
  }

  if (text.length > 1000) {
    return NextResponse.json(
      { error: "Слишком длинное сообщение" },
      { status: 400 }
    );
  }

  const result = await postMessage(conversationId, user.id, text);

  sendPushToStaff({
    title: `${user.name}: новое сообщение в поддержку`,
    body: text.slice(0, 120),
    url: "/eadmin30",
  });

  return NextResponse.json({
    id: result.messageId,
    text,
    createdAt: result.createdAt,
    isYou: true,
    isStaff: false,
  });
}
