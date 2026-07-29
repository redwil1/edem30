import "server-only";

import { sql } from "@/lib/db";
import { UserRole } from "@/lib/auth";
import { isOnline } from "@/lib/utils";

const STAFF_ROLES = new Set<UserRole>(["admin", "moderator"]);

export function isStaffRole(role: UserRole) {
  return STAFF_ROLES.has(role);
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
    WHERE role IN ('admin', 'moderator') AND last_seen_at > now() - interval '5 minutes'
    LIMIT 1
  `;

  return rows.some((r) => isOnline(r.lastSeenAt));
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
