import "server-only";

import webpush from "web-push";

import { sql } from "@/lib/db";
import { sendEmail } from "@/lib/email";

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    "mailto:support@edem30.ru",
    vapidPublicKey,
    vapidPrivateKey
  );
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

export async function saveSubscription(
  userId: number,
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } }
): Promise<void> {
  await sql`
    INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, created_at)
    VALUES (
      ${userId}, ${subscription.endpoint}, ${subscription.keys.p256dh}, ${subscription.keys.auth},
      to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    )
    ON CONFLICT (endpoint) DO UPDATE SET user_id = EXCLUDED.user_id
  `;
}

export async function removeSubscription(endpoint: string): Promise<void> {
  await sql`DELETE FROM push_subscriptions WHERE endpoint = ${endpoint}`;
}

type SubscriptionRow = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

export async function sendPushToUser(
  userId: number,
  payload: PushPayload
): Promise<void> {
  if (!vapidPublicKey || !vapidPrivateKey) return;

  const rows = await sql<SubscriptionRow[]>`
    SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ${userId}
  `;

  await Promise.all(rows.map((row) => sendToSubscription(row, payload)));
}

/**
 * Как sendPushToUser, но если у получателя нет ни одной активной
 * push-подписки — резервируется на email (транзакционное письмо о его же
 * поездке, не рассылка). Включено по умолчанию (users.email_notify_fallback),
 * можно выключить в настройках профиля. Использовать только для событий
 * жизненного цикла конкретной поездки пользователя — не для чата и не для
 * массовых уведомлений, иначе это превращается в спам.
 */
export async function notifyUserWithEmailFallback(
  userId: number,
  payload: PushPayload
): Promise<void> {
  const rows =
    vapidPublicKey && vapidPrivateKey
      ? await sql<SubscriptionRow[]>`
          SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ${userId}
        `
      : [];

  if (rows.length > 0) {
    await Promise.all(rows.map((row) => sendToSubscription(row, payload)));
    return;
  }

  const [user] = await sql<{ email: string | null; emailNotifyFallback: boolean }[]>`
    SELECT email, email_notify_fallback as "emailNotifyFallback" FROM users WHERE id = ${userId}
  `;

  if (!user?.email || !user.emailNotifyFallback) return;

  const html = `
    <p>${payload.body}</p>
    ${payload.url ? `<p><a href="https://edem30.ru${payload.url}">Открыть в Едем30</a></p>` : ""}
    <p style="color:#888;font-size:12px">
      Это письмо — резерв, потому что у вас не подключены push-уведомления.
      Отключить такие письма можно в настройках профиля: https://edem30.ru/profile
    </p>
  `;

  await sendEmail(user.email, `${payload.title} — Едем30`, html);
}

export async function sendPushToDrivers(payload: PushPayload): Promise<void> {
  if (!vapidPublicKey || !vapidPrivateKey) return;

  const rows = await sql<SubscriptionRow[]>`
    SELECT push_subscriptions.endpoint as endpoint, push_subscriptions.p256dh as p256dh,
           push_subscriptions.auth as auth
    FROM push_subscriptions
    JOIN users ON users.id = push_subscriptions.user_id
    WHERE users.role = 'driver'
  `;

  await Promise.all(rows.map((row) => sendToSubscription(row, payload)));
}

export async function sendPushToStaff(payload: PushPayload): Promise<void> {
  if (!vapidPublicKey || !vapidPrivateKey) return;

  const rows = await sql<SubscriptionRow[]>`
    SELECT push_subscriptions.endpoint as endpoint, push_subscriptions.p256dh as p256dh,
           push_subscriptions.auth as auth
    FROM push_subscriptions
    JOIN users ON users.id = push_subscriptions.user_id
    WHERE users.role IN ('admin', 'moderator')
  `;

  await Promise.all(rows.map((row) => sendToSubscription(row, payload)));
}

export type BroadcastSegment = "all" | "driver" | "passenger";

export async function sendPushToSegment(
  segment: BroadcastSegment,
  payload: PushPayload,
  excludeUserId?: number
): Promise<number> {
  if (!vapidPublicKey || !vapidPrivateKey) return 0;

  const rows = await sql<SubscriptionRow[]>`
    SELECT push_subscriptions.endpoint as endpoint, push_subscriptions.p256dh as p256dh,
           push_subscriptions.auth as auth
    FROM push_subscriptions
    JOIN users ON users.id = push_subscriptions.user_id
    WHERE ${segment === "all" ? sql`true` : sql`users.role = ${segment}`}
      AND (${excludeUserId ?? null}::int IS NULL OR push_subscriptions.user_id != ${excludeUserId ?? null})
  `;

  await Promise.all(rows.map((row) => sendToSubscription(row, payload)));

  return rows.length;
}

async function sendToSubscription(row: SubscriptionRow, payload: PushPayload) {
  try {
    await webpush.sendNotification(
      {
        endpoint: row.endpoint,
        keys: { p256dh: row.p256dh, auth: row.auth },
      },
      JSON.stringify(payload),
      // Apple's push service (web.push.apple.com) has been reported to be
      // stricter about missing TTL than Chrome/Firefox's endpoints.
      { TTL: 60 * 60 * 24 }
    );
  } catch (err) {
    const statusCode = (err as { statusCode?: number })?.statusCode;

    if (statusCode === 404 || statusCode === 410) {
      await removeSubscription(row.endpoint);
      return;
    }

    console.error(
      `[push] failed to send to ${row.endpoint.slice(0, 60)}...`,
      statusCode,
      (err as { body?: string })?.body ?? err
    );
  }
}
