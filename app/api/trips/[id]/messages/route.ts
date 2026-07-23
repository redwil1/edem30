import { NextRequest, NextResponse } from "next/server";

import { sql } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { checkChatMessage } from "@/lib/moderation";
import { rateLimit } from "@/lib/rateLimit";
import { isTrustedOrigin } from "@/lib/security";
import { publicStorageUrl } from "@/lib/storage";
import {
  getTripLifecycle,
  getTripOwnerId,
  getTripPartyMemberIds,
  isChatLocked,
  isTripPartyMember,
} from "@/lib/trips";
import { sendPushToUser } from "@/lib/push";

export const runtime = "nodejs";

type Props = {
  params: Promise<{ id: string }>;
};

type MessageRow = {
  id: number;
  user_id: number;
  name: string;
  avatar_url: string | null;
  avatar_preset: string | null;
  role: string;
  text: string;
  attachment_url: string | null;
  attachment_type: string | null;
  created_at: string;
};

const ATTACHMENT_TYPES = new Set(["image", "video"]);
const STAFF_ROLES = new Set(["admin", "moderator"]);

export async function GET(_req: Request, { params }: Props) {
  const { id } = await params;
  const tripId = Number(id);

  if (!Number.isInteger(tripId) || tripId <= 0) {
    return NextResponse.json({ error: "Некорректная поездка" }, { status: 400 });
  }

  const [user, ownerId, lifecycle, rows] = await Promise.all([
    getCurrentUser(),
    getTripOwnerId(tripId),
    getTripLifecycle(tripId),
    sql<MessageRow[]>`
      SELECT chat_messages.id as id, chat_messages.user_id as user_id,
             users.name as name, users.avatar_url as avatar_url,
             users.avatar_preset as avatar_preset, users.role as role,
             chat_messages.text as text, chat_messages.attachment_url as attachment_url,
             chat_messages.attachment_type as attachment_type,
             chat_messages.created_at as created_at
      FROM chat_messages
      JOIN users ON users.id = chat_messages.user_id
      WHERE chat_messages.trip_id = ${tripId}
      ORDER BY chat_messages.created_at ASC
    `,
  ]);

  const isStaffViewer = user ? STAFF_ROLES.has(user.role) : false;
  const isPartyMember = user ? await isTripPartyMember(tripId, user.id) : false;

  return NextResponse.json(
    {
      messages: rows.map((r) => ({
        id: r.id,
        authorName: r.name,
        avatarUrl: r.avatar_url,
        avatarPreset: r.avatar_preset,
        text: r.text,
        attachmentUrl: r.attachment_url,
        attachmentType: r.attachment_type,
        createdAt: r.created_at,
        isYou: user ? r.user_id === user.id : false,
        isDriver: r.user_id === ownerId,
        isStaff: STAFF_ROLES.has(r.role),
      })),
      canPost: (isPartyMember || isStaffViewer) && !isChatLocked(lifecycle.completedAt),
      completedAt: lifecycle.completedAt,
      chatLocked: isChatLocked(lifecycle.completedAt),
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

  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: "Войдите, чтобы писать в чат" },
      { status: 401 }
    );
  }

  const { id } = await params;
  const tripId = Number(id);

  if (!Number.isInteger(tripId) || tripId <= 0) {
    return NextResponse.json({ error: "Некорректная поездка" }, { status: 400 });
  }

  const isStaffSender = STAFF_ROLES.has(user.role);

  if (!isStaffSender && !(await isTripPartyMember(tripId, user.id))) {
    return NextResponse.json(
      { error: "Присоединитесь к поездке, чтобы писать в чат" },
      { status: 403 }
    );
  }

  const lifecycle = await getTripLifecycle(tripId);

  if (isChatLocked(lifecycle.completedAt)) {
    return NextResponse.json(
      { error: "Чат закрыт — поездка завершена больше минуты назад" },
      { status: 403 }
    );
  }

  const limit = rateLimit(`message:${user.id}`, {
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

  let attachmentUrl: string | null = null;

  if (attachmentPath) {
    if (!ATTACHMENT_TYPES.has(attachmentType)) {
      return NextResponse.json(
        { error: "Некорректный тип вложения" },
        { status: 400 }
      );
    }

    if (!attachmentPath.startsWith(`${tripId}/`)) {
      return NextResponse.json(
        { error: "Некорректный путь вложения" },
        { status: 400 }
      );
    }

    attachmentUrl = publicStorageUrl("chat-attachments", attachmentPath);
  }

  if (!text && !attachmentUrl) {
    return NextResponse.json({ error: "Пустое сообщение" }, { status: 400 });
  }

  if (text.length > 1000) {
    return NextResponse.json(
      { error: "Слишком длинное сообщение" },
      { status: 400 }
    );
  }

  if (text) {
    const moderation = checkChatMessage(text);

    if (moderation.blocked) {
      return NextResponse.json({ error: moderation.reason }, { status: 400 });
    }
  }

  const [ownerId, inserted] = await Promise.all([
    getTripOwnerId(tripId),
    sql<{ id: number; created_at: string }[]>`
      INSERT INTO chat_messages (trip_id, user_id, text, attachment_url, attachment_type)
      VALUES (${tripId}, ${user.id}, ${text}, ${attachmentUrl}, ${attachmentUrl ? attachmentType : null})
      RETURNING id, created_at
    `,
  ]);

  getTripPartyMemberIds(tripId, user.id).then((recipients) => {
    const preview = text || (attachmentUrl ? "Вложение" : "");

    return Promise.all(
      recipients.map((recipientId) =>
        sendPushToUser(recipientId, {
          title: isStaffSender
            ? `Поддержка (${user.name}): новое сообщение`
            : `${user.name}: новое сообщение`,
          body: preview.slice(0, 120),
          url: `/trip/${tripId}`,
        })
      )
    );
  });

  return NextResponse.json({
    id: inserted[0].id,
    authorName: user.name,
    avatarUrl: user.avatarUrl,
    avatarPreset: user.avatarPreset,
    text,
    attachmentUrl,
    attachmentType: attachmentUrl ? attachmentType : null,
    createdAt: inserted[0].created_at,
    isYou: true,
    isDriver: ownerId === user.id,
    isStaff: isStaffSender,
  });
}
