import "server-only";

import webpush from "web-push";

import { sql } from "@/lib/db";

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

async function sendToSubscription(row: SubscriptionRow, payload: PushPayload) {
  try {
    await webpush.sendNotification(
      {
        endpoint: row.endpoint,
        keys: { p256dh: row.p256dh, auth: row.auth },
      },
      JSON.stringify(payload)
    );
  } catch (err) {
    const statusCode = (err as { statusCode?: number })?.statusCode;

    if (statusCode === 404 || statusCode === 410) {
      await removeSubscription(row.endpoint);
    }
  }
}
