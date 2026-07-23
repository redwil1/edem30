import "server-only";

import { sql } from "@/lib/db";
import { sendPushToStaff } from "@/lib/push";

const API_BASE = "https://api.telegram.org";

function botToken(): string | null {
  return process.env.TELEGRAM_BOT_TOKEN ?? null;
}

export function isTelegramBotConfigured(): boolean {
  return Boolean(botToken());
}

export async function sendTelegramMessage(chatId: number | string, text: string): Promise<void> {
  const token = botToken();
  if (!token) return;

  await fetch(`${API_BASE}/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  }).catch(() => {});
}

export async function setTelegramWebhook(webhookUrl: string, secretToken: string): Promise<boolean> {
  const token = botToken();
  if (!token) return false;

  const res = await fetch(`${API_BASE}/bot${token}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: webhookUrl, secret_token: secretToken }),
  });

  const data = await res.json().catch(() => null);
  return Boolean(data?.ok);
}

export async function setTelegramBotDescription(): Promise<void> {
  const token = botToken();
  if (!token) return;

  await fetch(`${API_BASE}/bot${token}/setMyDescription`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      description:
        "Поддержка Едем30 — напишите сюда, если возникла проблема с поездкой, заказом такси или оплатой. Мы отвечаем в ближайшее время.",
    }),
  }).catch(() => {});

  await fetch(`${API_BASE}/bot${token}/setMyShortDescription`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      short_description: "Поддержка сервиса Едем30 — такси и попутчики по Астраханской области",
    }),
  }).catch(() => {});
}

type TelegramUpdate = {
  message?: {
    message_id: number;
    from?: { id: number; first_name: string; last_name?: string; username?: string };
    chat: { id: number };
    text?: string;
  };
};

const START_REPLY =
  "Здравствуйте! Это бот поддержки Едем30. Опишите проблему одним сообщением — мы прочитаем и ответим здесь же, в этом чате.";

const RECEIVED_REPLY = "Спасибо, сообщение получено. Мы ответим здесь в ближайшее время.";

export async function handleTelegramUpdate(update: TelegramUpdate): Promise<void> {
  const message = update.message;
  if (!message?.text || !message.from) return;

  const chatId = message.chat.id;

  if (message.text === "/start") {
    await sendTelegramMessage(chatId, START_REPLY);
    return;
  }

  const name = `${message.from.first_name} ${message.from.last_name ?? ""}`.trim();

  await sql`
    INSERT INTO telegram_messages (telegram_user_id, telegram_username, name, text)
    VALUES (${String(message.from.id)}, ${message.from.username ?? null}, ${name}, ${message.text})
  `;

  await sendTelegramMessage(chatId, RECEIVED_REPLY);

  sendPushToStaff({
    title: "Сообщение в Telegram-поддержку",
    body: `${name}: ${message.text.slice(0, 120)}`,
    url: "/eadmin30",
  });
}

export type TelegramMessageEntry = {
  id: number;
  name: string;
  username: string | null;
  text: string;
  resolved: boolean;
  createdAt: string;
};

type TelegramMessageRow = {
  id: number;
  name: string;
  telegram_username: string | null;
  text: string;
  resolved: boolean;
  created_at: string;
};

export async function listTelegramMessages(): Promise<TelegramMessageEntry[]> {
  const rows = await sql<TelegramMessageRow[]>`
    SELECT id, name, telegram_username, text, resolved, created_at
    FROM telegram_messages
    ORDER BY id DESC
    LIMIT 100
  `;

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    username: r.telegram_username,
    text: r.text,
    resolved: r.resolved,
    createdAt: r.created_at,
  }));
}

export async function resolveTelegramMessage(id: number): Promise<boolean> {
  const result = await sql`UPDATE telegram_messages SET resolved = true WHERE id = ${id}`;
  return result.count > 0;
}
