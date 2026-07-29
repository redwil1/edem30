import "server-only";

import { sql } from "@/lib/db";
import { UserRole } from "@/lib/auth";
import { isOnline } from "@/lib/utils";

const STAFF_ROLES = new Set<UserRole>(["admin", "moderator"]);

export function isStaffRole(role: UserRole) {
  return STAFF_ROLES.has(role);
}

/**
 * Личный чат между двумя пользователями (например водитель↔пассажир после
 * отклика на заявку) — использует тот же conversations/conversation_messages,
 * что и поддержка, но type='direct' и оба участника имеют равные права
 * (никто не обязан писать первым). Идемпотентно: повторный вызов для той
 * же пары возвращает уже существующий чат.
 */
export async function getOrCreateDirectConversation(
  userAId: number,
  userBId: number
): Promise<number> {
  const existing = await sql<{ id: number }[]>`
    SELECT c.id as "id"
    FROM conversations c
    WHERE c.type = 'direct'
      AND EXISTS (
        SELECT 1 FROM conversation_participants p
        WHERE p.conversation_id = c.id AND p.user_id = ${userAId}
      )
      AND EXISTS (
        SELECT 1 FROM conversation_participants p
        WHERE p.conversation_id = c.id AND p.user_id = ${userBId}
      )
      AND (
        SELECT COUNT(*) FROM conversation_participants p WHERE p.conversation_id = c.id
      ) = 2
    LIMIT 1
  `;

  if (existing[0]) return existing[0].id;

  const [conversation] = await sql<{ id: number }[]>`
    INSERT INTO conversations (type, created_by)
    VALUES ('direct', ${userAId})
    RETURNING id
  `;

  await sql`
    INSERT INTO conversation_participants (conversation_id, user_id)
    VALUES (${conversation.id}, ${userAId}), (${conversation.id}, ${userBId})
  `;

  return conversation.id;
}

export async function isDirectConversationParticipant(
  conversationId: number,
  userId: number
): Promise<boolean> {
  const rows = await sql<{ id: number }[]>`
    SELECT conversation_id as id FROM conversation_participants
    WHERE conversation_id = ${conversationId} AND user_id = ${userId}
  `;

  return rows.length > 0;
}

export type DirectConversationSummary = {
  id: number;
  otherUserId: number;
  otherUserName: string;
  otherUserAvatarUrl: string | null;
  otherUserAvatarPreset: string | null;
  lastMessageAt: string;
  lastMessageText: string | null;
};

/** Список личных чатов пользователя, новые сверху. */
export async function listDirectConversationsForUser(
  userId: number
): Promise<DirectConversationSummary[]> {
  return sql<DirectConversationSummary[]>`
    SELECT
      c.id as "id",
      u.id as "otherUserId",
      u.name as "otherUserName",
      u.avatar_url as "otherUserAvatarUrl",
      u.avatar_preset as "otherUserAvatarPreset",
      c.last_message_at as "lastMessageAt",
      lm.text as "lastMessageText"
    FROM conversations c
    JOIN conversation_participants me ON me.conversation_id = c.id AND me.user_id = ${userId}
    JOIN conversation_participants other ON other.conversation_id = c.id AND other.user_id != ${userId}
    JOIN users u ON u.id = other.user_id
    LEFT JOIN LATERAL (
      SELECT text FROM conversation_messages
      WHERE conversation_id = c.id
      ORDER BY created_at DESC
      LIMIT 1
    ) lm ON true
    WHERE c.type = 'direct'
    ORDER BY c.last_message_at DESC
  `;
}

export type SupportConversationRow = {
  id: number;
  subjectUserId: number;
  subjectName: string;
  subjectPhone: string | null;
  subjectAvatarUrl: string | null;
  subjectAvatarPreset: string | null;
  subjectLastSeenAt: string | null;
  lastMessageAt: string;
  lastMessageText: string | null;
  lastMessageAttachmentType: string | null;
  lastMessageSenderId: number | null;
  staffLastReadAt: string | null;
  unreadCount: number;
};

type SupportConversationListRow = Omit<SupportConversationRow, "unreadCount"> & {
  unreadCount: string;
};

/** Все треды поддержки для админки, новые сверху. */
export async function listSupportConversations(): Promise<SupportConversationRow[]> {
  const rows = await sql<SupportConversationListRow[]>`
    SELECT
      c.id as "id",
      c.subject_user_id as "subjectUserId",
      u.name as "subjectName",
      u.phone as "subjectPhone",
      u.avatar_url as "subjectAvatarUrl",
      u.avatar_preset as "subjectAvatarPreset",
      u.last_seen_at as "subjectLastSeenAt",
      c.last_message_at as "lastMessageAt",
      lm.text as "lastMessageText",
      lm.attachment_type as "lastMessageAttachmentType",
      lm.sender_id as "lastMessageSenderId",
      c.staff_last_read_at as "staffLastReadAt",
      (
        SELECT COUNT(*) FROM conversation_messages um
        WHERE um.conversation_id = c.id
          AND um.sender_id = c.subject_user_id
          AND (c.staff_last_read_at IS NULL OR um.created_at > c.staff_last_read_at)
      ) as "unreadCount"
    FROM conversations c
    JOIN users u ON u.id = c.subject_user_id
    LEFT JOIN LATERAL (
      SELECT text, sender_id, attachment_type
      FROM conversation_messages
      WHERE conversation_id = c.id
      ORDER BY created_at DESC
      LIMIT 1
    ) lm ON true
    WHERE c.type = 'support'
    ORDER BY c.last_message_at DESC
  `;

  return rows.map((r) => ({ ...r, unreadCount: Number(r.unreadCount) }));
}

/** Пользователи, которым можно написать (для поиска в админке). Сотрудников не показываем. */
export async function searchUsersForSupport(query: string) {
  const q = `%${query.trim()}%`;

  return sql<
    { id: number; name: string; phone: string | null; role: UserRole }[]
  >`
    SELECT id, name, phone, role
    FROM users
    WHERE role NOT IN ('admin', 'moderator')
      AND (name ILIKE ${q} OR phone ILIKE ${q})
    ORDER BY name ASC
    LIMIT 20
  `;
}

export async function getSupportConversationBySubject(subjectUserId: number) {
  const rows = await sql<{ id: number }[]>`
    SELECT id FROM conversations WHERE type = 'support' AND subject_user_id = ${subjectUserId}
  `;

  return rows[0]?.id ?? null;
}

export type ConversationMeta = {
  id: number;
  subjectUserId: number;
  userLastReadAt: string | null;
  staffLastReadAt: string | null;
};

export async function getConversationMeta(
  conversationId: number
): Promise<ConversationMeta | null> {
  const rows = await sql<ConversationMeta[]>`
    SELECT id as "id", subject_user_id as "subjectUserId",
           user_last_read_at as "userLastReadAt", staff_last_read_at as "staffLastReadAt"
    FROM conversations WHERE id = ${conversationId}
  `;

  return rows[0] ?? null;
}

export type ConversationMessageRow = {
  id: number;
  senderId: number;
  senderName: string;
  senderRole: UserRole;
  text: string;
  attachmentUrl: string | null;
  attachmentType: "image" | "video" | null;
  createdAt: string;
};

export async function getConversationMessages(
  conversationId: number
): Promise<ConversationMessageRow[]> {
  return sql<ConversationMessageRow[]>`
    SELECT
      m.id as "id",
      m.sender_id as "senderId",
      u.name as "senderName",
      u.role as "senderRole",
      m.text as "text",
      m.attachment_url as "attachmentUrl",
      m.attachment_type as "attachmentType",
      m.created_at as "createdAt"
    FROM conversation_messages m
    JOIN users u ON u.id = m.sender_id
    WHERE m.conversation_id = ${conversationId}
    ORDER BY m.created_at ASC
  `;
}

/** Сотрудник онлайн, если хоть один админ/модератор заходил в последние 5 минут. */
export async function isAnyStaffOnline(): Promise<boolean> {
  const rows = await sql<{ lastSeenAt: string | null }[]>`
    SELECT last_seen_at as "lastSeenAt" FROM users
    WHERE role IN ('admin', 'moderator')
  `;

  return rows.some((r) => isOnline(r.lastSeenAt));
}

export async function markParticipantRead(conversationId: number, userId: number) {
  await sql`
    UPDATE conversation_participants SET last_read_at = now()
    WHERE conversation_id = ${conversationId} AND user_id = ${userId}
  `;
}

export async function getOtherParticipantId(
  conversationId: number,
  excludeUserId: number
): Promise<number | null> {
  const rows = await sql<{ userId: number }[]>`
    SELECT user_id as "userId" FROM conversation_participants
    WHERE conversation_id = ${conversationId} AND user_id != ${excludeUserId}
  `;

  return rows[0]?.userId ?? null;
}

export async function getOtherParticipantLastRead(
  conversationId: number,
  excludeUserId: number
): Promise<string | null> {
  const rows = await sql<{ lastReadAt: string | null }[]>`
    SELECT last_read_at as "lastReadAt" FROM conversation_participants
    WHERE conversation_id = ${conversationId} AND user_id != ${excludeUserId}
  `;

  return rows[0]?.lastReadAt ?? null;
}

export async function markUserRead(conversationId: number) {
  await sql`UPDATE conversations SET user_last_read_at = now() WHERE id = ${conversationId}`;
}

export async function markStaffRead(conversationId: number) {
  await sql`UPDATE conversations SET staff_last_read_at = now() WHERE id = ${conversationId}`;
}

/**
 * Только сотрудник может начать диалог поддержки с пользователем.
 * Повторные вызовы для того же пользователя возвращают уже существующий тред.
 */
export async function startSupportConversation(
  staffId: number,
  subjectUserId: number,
  text: string,
  attachment?: { url: string; type: "image" | "video" }
) {
  const [conversation] = await sql<{ id: number }[]>`
    INSERT INTO conversations (type, subject_user_id, created_by)
    VALUES ('support', ${subjectUserId}, ${staffId})
    ON CONFLICT (subject_user_id) WHERE type = 'support'
    DO UPDATE SET last_message_at = conversations.last_message_at
    RETURNING id
  `;

  await sql`
    INSERT INTO conversation_participants (conversation_id, user_id)
    VALUES (${conversation.id}, ${subjectUserId})
    ON CONFLICT (conversation_id, user_id) DO NOTHING
  `;

  return postMessage(conversation.id, staffId, text, attachment);
}

export type SupportMessageNotice = {
  id: number;
  text: string;
  createdAt: string;
};

/** Ответы админа/модератора конкретному пользователю за последние 2 часа — для тоста и звука у пользователя. */
export async function getRecentAdminRepliesForUser(
  userId: number,
  limit = 20
): Promise<SupportMessageNotice[]> {
  return sql<SupportMessageNotice[]>`
    SELECT m.id as "id", m.text as "text", m.created_at as "createdAt"
    FROM conversation_messages m
    JOIN conversations c ON c.id = m.conversation_id
    JOIN users u ON u.id = m.sender_id
    WHERE c.type = 'support' AND c.subject_user_id = ${userId}
      AND m.sender_id != ${userId}
      AND (u.role = 'admin' OR u.role = 'moderator')
      AND m.created_at > now() - interval '2 hours'
    ORDER BY m.created_at DESC
    LIMIT ${limit}
  `;
}

export type SupportUserMessageNotice = {
  id: number;
  subjectUserId: number;
  subjectName: string;
  text: string;
  createdAt: string;
};

/** Сообщения пользователей в поддержку за последние 2 часа — для тоста и звука у сотрудников. */
export async function getRecentUserMessagesForStaff(
  limit = 20
): Promise<SupportUserMessageNotice[]> {
  return sql<SupportUserMessageNotice[]>`
    SELECT m.id as "id", c.subject_user_id as "subjectUserId", u.name as "subjectName",
           m.text as "text", m.created_at as "createdAt"
    FROM conversation_messages m
    JOIN conversations c ON c.id = m.conversation_id
    JOIN users u ON u.id = c.subject_user_id
    WHERE c.type = 'support' AND m.sender_id = c.subject_user_id
      AND m.created_at > now() - interval '2 hours'
    ORDER BY m.created_at DESC
    LIMIT ${limit}
  `;
}

export async function postMessage(
  conversationId: number,
  senderId: number,
  text: string,
  attachment?: { url: string; type: "image" | "video" }
) {
  const [message] = await sql<{ id: number; createdAt: string }[]>`
    INSERT INTO conversation_messages (conversation_id, sender_id, text, attachment_url, attachment_type)
    VALUES (${conversationId}, ${senderId}, ${text}, ${attachment?.url ?? null}, ${attachment?.type ?? null})
    RETURNING id, created_at as "createdAt"
  `;

  await sql`
    UPDATE conversations SET last_message_at = ${message.createdAt} WHERE id = ${conversationId}
  `;

  return { conversationId, messageId: message.id, createdAt: message.createdAt };
}
