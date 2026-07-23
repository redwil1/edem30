import "server-only";

import crypto from "crypto";

import { sql } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { isPlaceholderName } from "@/lib/nameValidation";

export type OAuthProvider = "vk" | "ok" | "telegram";

export type OAuthProfile = {
  provider: OAuthProvider;
  providerId: string;
  name: string;
  avatarUrl: string | null;
};

async function findUserByProvider(
  provider: OAuthProvider,
  providerId: string
): Promise<number | null> {
  const rows =
    provider === "vk"
      ? await sql<{ id: number }[]>`SELECT id FROM users WHERE vk_id = ${providerId}`
      : provider === "ok"
      ? await sql<{ id: number }[]>`SELECT id FROM users WHERE ok_id = ${providerId}`
      : await sql<{ id: number }[]>`SELECT id FROM users WHERE telegram_id = ${providerId}`;

  return rows[0]?.id ?? null;
}

async function insertOAuthUser(
  provider: OAuthProvider,
  providerId: string,
  name: string,
  avatarUrl: string | null,
  passwordHash: string
): Promise<number> {
  const rows =
    provider === "vk"
      ? await sql<{ id: number }[]>`
          INSERT INTO users (name, password_hash, avatar_url, vk_id)
          VALUES (${name}, ${passwordHash}, ${avatarUrl}, ${providerId})
          RETURNING id
        `
      : provider === "ok"
      ? await sql<{ id: number }[]>`
          INSERT INTO users (name, password_hash, avatar_url, ok_id)
          VALUES (${name}, ${passwordHash}, ${avatarUrl}, ${providerId})
          RETURNING id
        `
      : await sql<{ id: number }[]>`
          INSERT INTO users (name, password_hash, avatar_url, telegram_id)
          VALUES (${name}, ${passwordHash}, ${avatarUrl}, ${providerId})
          RETURNING id
        `;

  return rows[0].id;
}

const PROVIDER_LABEL: Record<OAuthProvider, string> = {
  vk: "VK",
  ok: "OK",
  telegram: "Telegram",
};

/** Находит пользователя по привязанному соцаккаунту или создаёт нового, и открывает сессию. */
export async function loginWithOAuthProfile(profile: OAuthProfile): Promise<number> {
  const existingId = await findUserByProvider(profile.provider, profile.providerId);

  if (existingId !== null) {
    await createSession(existingId);
    return existingId;
  }

  const name =
    !profile.name || isPlaceholderName(profile.name)
      ? `Пользователь ${PROVIDER_LABEL[profile.provider]}`
      : profile.name.slice(0, 60);

  const randomPasswordHash = crypto.randomBytes(32).toString("hex");

  const userId = await insertOAuthUser(
    profile.provider,
    profile.providerId,
    name,
    profile.avatarUrl,
    randomPasswordHash
  );

  await createSession(userId);
  return userId;
}
