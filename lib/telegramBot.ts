import "server-only";

import crypto from "crypto";

import { sql } from "@/lib/db";
import { sendPushToStaff } from "@/lib/push";
import { normalizePhone } from "@/lib/phone";

const API_BASE = "https://api.telegram.org";

function botToken(): string | null {
  return process.env.TELEGRAM_BOT_TOKEN ?? null;
}

export function isTelegramBotConfigured(): boolean {
  return Boolean(botToken());
}

type ReplyKeyboard = {
  keyboard: { text: string; request_contact?: boolean }[][];
  resize_keyboard: boolean;
  one_time_keyboard: boolean;
};

export async function sendTelegramMessage(
  chatId: number | string,
  text: string,
  replyMarkup?: ReplyKeyboard
): Promise<void> {
  const token = botToken();
  if (!token) return;

  await fetch(`${API_BASE}/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      reply_markup: replyMarkup,
    }),
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
        "Поддержка Едем30 — напишите сюда, если возникла проблема с поездкой, заказом такси или оплатой. Мы отвечаем в ближайшее время. Также здесь можно получить код для входа на сайт.",
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
    contact?: { phone_number: string; user_id?: number };
  };
};

const START_REPLY =
  "Здравствуйте! Это бот Едем30. Нажмите кнопку ниже, чтобы поделиться номером телефона — тогда сможете входить на сайт по коду через Telegram, без пароля.\n\nТакже можно просто описать проблему сообщением — мы прочитаем и ответим здесь же.";

const CONTACT_KEYBOARD: ReplyKeyboard = {
  keyboard: [[{ text: "📱 Поделиться номером", request_contact: true }]],
  resize_keyboard: true,
  one_time_keyboard: true,
};

const RECEIVED_REPLY = "Спасибо, сообщение получено. Мы ответим здесь в ближайшее время.";

function normalizeTelegramPhone(raw: string): string {
  const digits = normalizePhone(raw);
  // Telegram отдаёт номер без ведущей 7/8 иногда с 7, приводим к 11 цифрам с 7.
  if (digits.length === 10) return `7${digits}`;
  if (digits.length === 11 && digits.startsWith("8")) return `7${digits.slice(1)}`;
  return digits;
}

export async function handleTelegramUpdate(update: TelegramUpdate): Promise<void> {
  const message = update.message;
  if (!message?.from) return;

  const chatId = message.chat.id;

  if (message.contact) {
    const phone = normalizeTelegramPhone(message.contact.phone_number);

    await sql`
      INSERT INTO telegram_phone_links (phone, chat_id, telegram_username)
      VALUES (${phone}, ${String(chatId)}, ${message.from.username ?? null})
      ON CONFLICT (phone) DO UPDATE SET chat_id = ${String(chatId)}, telegram_username = ${message.from.username ?? null}
    `;

    await sql`UPDATE users SET telegram_id = ${String(chatId)} WHERE phone = ${phone}`;

    await sendTelegramMessage(
      chatId,
      "Готово! Номер привязан. Теперь на сайте в форме входа выберите «Войти по коду в Telegram», введите этот номер — код придёт сюда."
    );
    return;
  }

  if (!message.text) return;

  if (message.text === "/start") {
    await sendTelegramMessage(chatId, START_REPLY, CONTACT_KEYBOARD);
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

// --- Вход по коду через Telegram ---

const CODE_TTL_MS = 5 * 60_000;

export async function findTelegramChatIdForPhone(phone: string): Promise<string | null> {
  const linked = await sql<{ chat_id: string }[]>`
    SELECT chat_id FROM telegram_phone_links WHERE phone = ${phone}
  `;

  if (linked[0]) return linked[0].chat_id;

  const user = await sql<{ telegram_id: string | null }[]>`
    SELECT telegram_id FROM users WHERE phone = ${phone} AND telegram_id IS NOT NULL
  `;

  return user[0]?.telegram_id ?? null;
}

export async function requestTelegramLoginCode(
  rawPhone: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const phone = normalizePhone(rawPhone);

  if (phone.length !== 11) {
    return { ok: false, error: "Номер телефона должен содержать 11 цифр" };
  }

  const chatId = await findTelegramChatIdForPhone(phone);

  if (!chatId) {
    return {
      ok: false,
      error:
        "Этот номер не привязан к Telegram. Напишите /start боту @edem30bot и поделитесь номером, затем попробуйте снова.",
    };
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();

  await sql`
    INSERT INTO telegram_auth_codes (phone, code, expires_at)
    VALUES (${phone}, ${code}, ${expiresAt})
  `;

  await sendTelegramMessage(chatId, `Код для входа на Едем30: ${code}\nДействует 5 минут.`);

  return { ok: true };
}

export async function verifyTelegramLoginCode(
  rawPhone: string,
  code: string
): Promise<{ ok: true; phone: string } | { ok: false; error: string }> {
  const phone = normalizePhone(rawPhone);

  const rows = await sql<{ id: number; expires_at: string; used_at: string | null }[]>`
    SELECT id, expires_at, used_at FROM telegram_auth_codes
    WHERE phone = ${phone} AND code = ${code}
    ORDER BY id DESC
    LIMIT 1
  `;

  const row = rows[0];

  if (!row) {
    return { ok: false, error: "Неверный код" };
  }

  if (row.used_at) {
    return { ok: false, error: "Этот код уже использован" };
  }

  if (new Date(row.expires_at).getTime() < Date.now()) {
    return { ok: false, error: "Код устарел, запросите новый" };
  }

  await sql`UPDATE telegram_auth_codes SET used_at = ${new Date().toISOString()} WHERE id = ${row.id}`;

  return { ok: true, phone };
}

export async function findOrCreateUserByVerifiedPhone(phone: string): Promise<number> {
  const existing = await sql<{ id: number }[]>`SELECT id FROM users WHERE phone = ${phone}`;

  if (existing[0]) return existing[0].id;

  const chatId = await findTelegramChatIdForPhone(phone);
  const randomPasswordHash = crypto.randomBytes(32).toString("hex");

  const inserted = await sql<{ id: number }[]>`
    INSERT INTO users (name, phone, password_hash, telegram_id)
    VALUES (${"Пользователь Telegram"}, ${phone}, ${randomPasswordHash}, ${chatId})
    RETURNING id
  `;

  return inserted[0].id;
}
