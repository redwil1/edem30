import "server-only";

import { sql } from "@/lib/db";
import { UserRole } from "@/lib/auth";

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
  lastMessageAt: string;
  lastMessageText: string | null;
  lastMessageSenderId: number | null;
};

/** Все треды поддержки для админки, новые сверху. */
export async function listSupportConversations(): Promise<SupportConversationRow[]> {
  return sql<SupportConversationRow[]>`
    SELECT
      c.id as "id",
      c.subject_user_id as "subjectUserId",
      u.name as "subjectName",
      u.phone as "subjectPhone",
      u.avatar_url as "subjectAvatarUrl",
      u.avatar_preset as "subjectAvatarPreset",
      c.last_message_at as "lastMessageAt",
      lm.text as "lastMessageText",
      lm.sender_id as "lastMessageSenderId"
    FROM conversations c
    JOIN users u ON u.id = c.subject_user_id
    LEFT JOIN LATERAL (
      SELECT text, sender_id
      FROM conversation_messages
      WHERE conversation_id = c.id
      ORDER BY created_at DESC
      LIMIT 1
    ) lm ON true
    WHERE c.type = 'support'
    ORDER BY c.last_message_at DESC
  `;
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

export type ConversationMessageRow = {
  id: number;
  senderId: number;
  senderName: string;
  senderRole: UserRole;
  text: string;
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
      m.created_at as "createdAt"
    FROM conversation_messages m
    JOIN users u ON u.id = m.sender_id
    WHERE m.conversation_id = ${conversationId}
    ORDER BY m.created_at ASC
  `;
}

/**
 * Только сотрудник может начать диалог поддержки с пользователем.
 * Повторные вызовы для того же пользователя возвращают уже существующий тред.
 */
export async function startSupportConversation(
  staffId: number,
  subjectUserId: number,
  text: string
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

  return postMessage(conversation.id, staffId, text);
}

export async function postMessage(
  conversationId: number,
  senderId: number,
  text: string
) {
  const [message] = await sql<{ id: number; createdAt: string }[]>`
    INSERT INTO conversation_messages (conversation_id, sender_id, text)
    VALUES (${conversationId}, ${senderId}, ${text})
    RETURNING id, created_at as "createdAt"
  `;

  await sql`
    UPDATE conversations SET last_message_at = ${message.createdAt} WHERE id = ${conversationId}
  `;

  return { conversationId, messageId: message.id, createdAt: message.createdAt };
}
