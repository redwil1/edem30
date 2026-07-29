import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import {
  getConversationMessages,
  getOtherParticipantId,
  getOtherParticipantLastRead,
  isDirectConversationParticipant,
  markParticipantRead,
  postMessage,
} from "@/lib/conversations";
import { rateLimit } from "@/lib/rateLimit";
import { isTrustedOrigin } from "@/lib/security";
import { publicStorageUrl } from "@/lib/storage";
import { sendPushToUser } from "@/lib/push";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

type Props = { params: Promise<{ id: string }> };

const ATTACHMENT_TYPES = new Set(["image", "video"]);

export async function GET(_req: Request, { params }: Props) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Войдите в аккаунт" }, { status: 401 });
  }

  const { id } = await params;
  const conversationId = Number(id);
  if (!Number.isInteger(conversationId) || conversationId <= 0) {
    return NextResponse.json({ error: "Некорректный чат" }, { status: 400 });
  }

  const isParticipant = await isDirectConversationParticipant(conversationId, user.id);
  if (!isParticipant) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const [rows, otherLastReadAt, otherUserId] = await Promise.all([
    getConversationMessages(conversationId),
    getOtherParticipantLastRead(conversationId, user.id),
    getOtherParticipantId(conversationId, user.id),
  ]);

  const otherRows = otherUserId
    ? await sql<
        { id: number; name: string; avatarUrl: string | null; avatarPreset: string | null; lastSeenAt: string | null }[]
      >`
        SELECT id, name, avatar_url as "avatarUrl", avatar_preset as "avatarPreset", last_seen_at as "lastSeenAt"
        FROM users WHERE id = ${otherUserId}
      `
    : [];

  markParticipantRead(conversationId, user.id);

  return NextResponse.json(
    {
      otherParticipant: otherRows[0]
        ? {
            id: otherRows[0].id,
            name: otherRows[0].name,
            avatarUrl: otherRows[0].avatarUrl,
            avatarPreset: otherRows[0].avatarPreset,
            lastSeenAt: otherRows[0].lastSeenAt,
          }
        : null,
      messages: rows.map((m) => ({
        id: m.id,
        text: m.text,
        attachmentUrl: m.attachmentUrl,
        attachmentType: m.attachmentType,
        createdAt: m.createdAt,
        isYou: m.senderId === user.id,
        senderName: m.senderName,
        read:
          m.senderId === user.id &&
          !!otherLastReadAt &&
          new Date(otherLastReadAt).getTime() >= new Date(m.createdAt).getTime(),
      })),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(req: NextRequest, { params }: Props) {
  if (!isTrustedOrigin(req)) {
    return NextResponse.json({ error: "Недопустимый источник запроса" }, { status: 403 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Войдите в аккаунт" }, { status: 401 });
  }

  const { id } = await params;
  const conversationId = Number(id);
  if (!Number.isInteger(conversationId) || conversationId <= 0) {
    return NextResponse.json({ error: "Некорректный чат" }, { status: 400 });
  }

  const isParticipant = await isDirectConversationParticipant(conversationId, user.id);
  if (!isParticipant) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const limit = rateLimit(`direct-message:${user.id}`, { limit: 30, windowMs: 60_000 });
  if (!limit.allowed) {
    return NextResponse.json({ error: "Слишком много сообщений. Подождите немного." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  const attachmentPath = typeof body?.attachmentPath === "string" ? body.attachmentPath : "";
  const attachmentType = typeof body?.attachmentType === "string" ? body.attachmentType : "";

  let attachment: { url: string; type: "image" | "video" } | undefined;

  if (attachmentPath) {
    if (!ATTACHMENT_TYPES.has(attachmentType)) {
      return NextResponse.json({ error: "Некорректный тип вложения" }, { status: 400 });
    }
    if (!attachmentPath.startsWith(`direct-${conversationId}/`)) {
      return NextResponse.json({ error: "Некорректный путь вложения" }, { status: 400 });
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
    return NextResponse.json({ error: "Слишком длинное сообщение" }, { status: 400 });
  }

  const result = await postMessage(conversationId, user.id, text, attachment);

  const otherUserId = await getOtherParticipantId(conversationId, user.id);
  if (otherUserId) {
    sendPushToUser(otherUserId, {
      title: `${user.name}: новое сообщение`,
      body: text.slice(0, 120) || "Вложение",
      url: `/dm/${conversationId}`,
    });
  }

  return NextResponse.json({
    id: result.messageId,
    text,
    attachmentUrl: attachment?.url ?? null,
    attachmentType: attachment?.type ?? null,
    createdAt: result.createdAt,
    isYou: true,
    senderName: user.name,
    read: false,
  });
}
