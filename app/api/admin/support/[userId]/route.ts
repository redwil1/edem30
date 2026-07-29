import { NextRequest, NextResponse } from "next/server";

import { requireStaff } from "@/lib/admin";
import {
  getConversationMessages,
  getSupportConversationBySubject,
  postMessage,
  startSupportConversation,
} from "@/lib/conversations";
import { isTrustedOrigin } from "@/lib/security";
import { sendPushToUser } from "@/lib/push";

type Props = {
  params: Promise<{ userId: string }>;
};

export async function GET(_req: Request, { params }: Props) {
  const staff = await requireStaff();

  if (!staff) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const { userId } = await params;
  const subjectUserId = Number(userId);

  if (!Number.isInteger(subjectUserId) || subjectUserId <= 0) {
    return NextResponse.json({ error: "Некорректный пользователь" }, { status: 400 });
  }

  const conversationId = await getSupportConversationBySubject(subjectUserId);

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
        isStaff: m.senderRole === "admin" || m.senderRole === "moderator",
        senderName: m.senderName,
      })),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(req: NextRequest, { params }: Props) {
  if (!isTrustedOrigin(req)) {
    return NextResponse.json(
      { error: "Недопустимый источник запроса" },
      { status: 403 }
    );
  }

  const staff = await requireStaff();

  if (!staff) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const { userId } = await params;
  const subjectUserId = Number(userId);

  if (!Number.isInteger(subjectUserId) || subjectUserId <= 0) {
    return NextResponse.json({ error: "Некорректный пользователь" }, { status: 400 });
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

  const existingConversationId = await getSupportConversationBySubject(subjectUserId);

  const result = existingConversationId
    ? await postMessage(existingConversationId, staff.id, text)
    : await startSupportConversation(staff.id, subjectUserId, text);

  sendPushToUser(subjectUserId, {
    title: "Поддержка Едем30",
    body: text.slice(0, 120),
    url: "/chat",
  });

  return NextResponse.json({
    id: result.messageId,
    text,
    createdAt: result.createdAt,
    isStaff: true,
    senderName: staff.name,
  });
}
