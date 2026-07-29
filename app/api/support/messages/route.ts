import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import {
  getConversationMessages,
  getConversationMeta,
  getSupportConversationBySubject,
  isAnyStaffOnline,
  markUserRead,
  postMessage,
} from "@/lib/conversations";
import { rateLimit } from "@/lib/rateLimit";
import { isTrustedOrigin } from "@/lib/security";
import { publicStorageUrl } from "@/lib/storage";
import { sendPushToStaff } from "@/lib/push";

export const runtime = "nodejs";

const ATTACHMENT_TYPES = new Set(["image", "video"]);

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
    const staffOnline = await isAnyStaffOnline();
    return NextResponse.json(
      { conversationExists: false, messages: [], staffOnline },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  const [rows, meta, staffOnline] = await Promise.all([
    getConversationMessages(conversationId),
    getConversationMeta(conversationId),
    isAnyStaffOnline(),
  ]);

  markUserRead(conversationId);

  const staffLastReadAt = meta?.staffLastReadAt ?? null;

  return NextResponse.json(
    {
      conversationExists: true,
      staffOnline,
      messages: rows.map((m) => ({
        id: m.id,
        text: m.text,
        attachmentUrl: m.attachmentUrl,
        attachmentType: m.attachmentType,
        createdAt: m.createdAt,
        isYou: m.senderId === user.id,
        isStaff: m.senderRole === "admin" || m.senderRole === "moderator",
        read:
          m.senderId === user.id &&
          !!staffLastReadAt &&
          new Date(staffLastReadAt).getTime() >= new Date(m.createdAt).getTime(),
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
  const attachmentPath =
    typeof body?.attachmentPath === "string" ? body.attachmentPath : "";
  const attachmentType =
    typeof body?.attachmentType === "string" ? body.attachmentType : "";

  let attachment: { url: string; type: "image" | "video" } | undefined;

  if (attachmentPath) {
    if (!ATTACHMENT_TYPES.has(attachmentType)) {
      return NextResponse.json(
        { error: "Некорректный тип вложения" },
        { status: 400 }
      );
    }

    if (!attachmentPath.startsWith(`support-${user.id}/`)) {
      return NextResponse.json(
        { error: "Некорректный путь вложения" },
        { status: 400 }
      );
    }

    attachment = {
      url: publicStorageUrl("chat-attachments", attachmentPath),
      type: attachmentType as "image" | "video",
    };
  }

  if (!text && !attachment) {
    return NextResponse.json({ error: "Пустое сообщение" }, { status: 400 });
  }

  if (text.length > 1000) {
    return NextResponse.json(
      { error: "Слишком длинное сообщение" },
      { status: 400 }
    );
  }

  const result = await postMessage(conversationId, user.id, text, attachment);

  sendPushToStaff({
    title: `${user.name}: новое сообщение в поддержку`,
    body: text.slice(0, 120) || "Вложение",
    url: "/eadmin30",
  });

  return NextResponse.json({
    id: result.messageId,
    text,
    attachmentUrl: attachment?.url ?? null,
    attachmentType: attachment?.type ?? null,
    createdAt: result.createdAt,
    isYou: true,
    isStaff: false,
    read: false,
  });
}
