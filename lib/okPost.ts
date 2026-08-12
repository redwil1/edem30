import "server-only";
import crypto from "crypto";

import { sql } from "@/lib/db";

// Группа "Харабали базарчик" — https://ok.ru/kharabalibazar, админ — владелец Едем30
const OK_GROUP_ID = "60182043689190";

export type OkPost = {
  id: number;
  content: string;
  status: "draft" | "published" | "failed";
  error: string | null;
  createdAt: string;
  publishedAt: string | null;
};

type OkPostRow = {
  id: number;
  content: string;
  status: "draft" | "published" | "failed";
  error: string | null;
  created_at: string;
  published_at: string | null;
};

function toOkPost(r: OkPostRow): OkPost {
  return {
    id: r.id,
    content: r.content,
    status: r.status,
    error: r.error,
    createdAt: r.created_at,
    publishedAt: r.published_at,
  };
}

export async function listOkPosts(): Promise<OkPost[]> {
  const rows = await sql<OkPostRow[]>`
    SELECT id, content, status, error, created_at, published_at
    FROM ok_posts
    ORDER BY id DESC
    LIMIT 50
  `;

  return rows.map(toOkPost);
}

/**
 * Подпись запроса к api.ok.ru/fb.do: параметры (кроме sig) сортируются по
 * ключу, конкатенируются как key=value без разделителей, к строке
 * добавляется секрет и берётся MD5. Для OAuth-токена секрет — это
 * MD5(access_token + application_secret_key), а не сам application_secret_key.
 * https://apiok.ru/en/dev/methods/rest/
 */
function signRequest(params: Record<string, string>, accessToken: string, appSecret: string): string {
  const sortedKeys = Object.keys(params).sort();
  const base = sortedKeys.map((key) => `${key}=${params[key]}`).join("");
  const tokenSecret = crypto.createHash("md5").update(accessToken + appSecret).digest("hex");

  return crypto.createHash("md5").update(base + tokenSecret).digest("hex");
}

async function callOkApi(
  method: string,
  params: Record<string, string>
): Promise<{ ok: true; data: unknown } | { ok: false; error: string }> {
  const appKey = process.env.OK_APPLICATION_KEY;
  const appSecret = process.env.OK_APPLICATION_SECRET_KEY;
  const accessToken = process.env.OK_ACCESS_TOKEN;

  if (!appKey || !appSecret || !accessToken) {
    return {
      ok: false,
      error:
        "OK.ru не настроен: нужны переменные окружения OK_APPLICATION_KEY, OK_APPLICATION_SECRET_KEY, OK_ACCESS_TOKEN",
    };
  }

  const allParams: Record<string, string> = {
    ...params,
    application_key: appKey,
    method,
    format: "json",
  };

  const sig = signRequest(allParams, accessToken, appSecret);

  const body = new URLSearchParams({
    ...allParams,
    access_token: accessToken,
    sig,
  });

  try {
    const res = await fetch("https://api.ok.ru/fb.do", {
      method: "POST",
      body,
    });

    const data = await res.json().catch(() => null);

    if (!data) return { ok: false, error: "Пустой ответ от OK.ru" };

    if (typeof data === "object" && data !== null && "error_code" in data) {
      const err = data as { error_msg?: string; error_code?: number };
      return { ok: false, error: err.error_msg || `Ошибка OK.ru (код ${err.error_code})` };
    }

    return { ok: true, data };
  } catch {
    return { ok: false, error: "Не удалось подключиться к OK.ru" };
  }
}

export async function publishOkPost(
  content: string,
  postedBy: number
): Promise<OkPost> {
  const attachment = JSON.stringify({
    media: [{ type: "text", text: content }],
  });

  // type=GROUP_THEME — не подтверждено живым вызовом (нет токена с
  // GROUP_CONTENT/PUBLISH_TO_STREAM для проверки). Если OK.ru вернёт ошибку
  // про owner type — см. error в результате и поправить это значение.
  const result = await callOkApi("mediatopic.post", {
    gid: OK_GROUP_ID,
    type: "GROUP_THEME",
    attachment,
  });

  const status = result.ok ? "published" : "failed";
  const error = result.ok ? null : result.error;
  const now = new Date().toISOString();

  const rows = await sql<OkPostRow[]>`
    INSERT INTO ok_posts (content, status, error, posted_by, published_at)
    VALUES (${content}, ${status}, ${error}, ${postedBy}, ${result.ok ? now : null})
    RETURNING id, content, status, error, created_at, published_at
  `;

  return toOkPost(rows[0]);
}
