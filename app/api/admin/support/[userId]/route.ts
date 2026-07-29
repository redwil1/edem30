import { NextRequest, NextResponse } from "next/server";

import { requireStaff } from "@/lib/admin";
import {
  getConversationMessages,
  getConversationMeta,
  getSupportConversationBySubject,
  markStaffRead,
  postMessage,
  startSupportConversation,
} from "@/lib/conversations";
import { isTrustedOrigin } from "@/lib/security";
import { sendPushToUser } from "@/lib/push";
import { isOnline } from "@/lib/utils";
import { sql } from "@/lib/db";
import { publicStorageUrl } from "@/lib/storage";

type Props = {
  params: Promise<{ userId: string }>;
};

const ATTACHMENT_TYPES = new Set(["image", "video"]);

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

  const subjectRows = await sql<{ lastSeenAt: string | null }[]>`
    SELECT last_seen_at as "lastSeenAt" FROM users WHERE id = ${subjectUserId}
  `;
  const subjectOnline = isOnline(subjectRows[0]?.lastSeenAt ?? null);

  const conversationId = await getSupportConversationBySubject(subjectUserId);

  if (!conversationId) {
    return NextResponse.json(
      { conversationExists: false, messages: [], subjectOnline },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  const [rows, meta] = await Promise.all([
    getConversationMessages(conversationId),
    getConversationMeta(conversationId),
  ]);

  markStaffRead(conversationId);

  const userLastReadAt = meta?.userLastReadAt ?? null;

  return NextResponse.json(
    {
      conversationExists: true,
      subjectOnline,
      messages: rows.map((m) => ({
        id: m.id,
        text: m.text,
        attachmentUrl: m.attachmentUrl,
        attachmentType: m.attachmentType,
        createdAt: m.createdAt,
        isStaff: m.senderRole === "admin" || m.senderRole === "moderator",
        senderName: m.senderName,
        read:
          (m.senderRole === "admin" || m.senderRole === "moderator") &&
          !!userLastReadAt &&
          new Date(userLastReadAt).getTime() >= new Date(m.createdAt).getTime(),
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

    if (!attachmentPath.startsWith(`support-${subjectUserId}/`)) {
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

  const existingConversationId = await getSupportConversationBySubject(subjectUserId);

  const result = existingConversationId
    ? await postMessage(existingConversationId, staff.id, text, attachment)
    : await startSupportConversation(staff.id, subjectUserId, text, attachment);

  sendPushToUser(subjectUserId, {
    title: "Поддержка Едем30",
    body: text.slice(0, 120) || "Вложение",
    url: "/chat",
  });

  return NextResponse.json({
    id: result.messageId,
    text,
    attachmentUrl: attachment?.url ?? null,
    attachmentType: attachment?.type ?? null,
    createdAt: result.createdAt,
    isStaff: true,
    senderName: staff.name,
    read: false,
  });
}
