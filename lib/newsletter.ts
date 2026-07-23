import "server-only";

import { sql } from "@/lib/db";
import { BroadcastSegment, sendPushToSegment } from "@/lib/push";

export type NewsletterEntry = {
  id: number;
  title: string;
  body: string;
  url: string | null;
  segment: BroadcastSegment;
  recipientsCount: number;
  createdAt: string;
};

type NewsletterRow = {
  id: number;
  title: string;
  body: string;
  url: string | null;
  segment: BroadcastSegment;
  recipients_count: number;
  created_at: string;
};

function toEntry(r: NewsletterRow): NewsletterEntry {
  return {
    id: r.id,
    title: r.title,
    body: r.body,
    url: r.url,
    segment: r.segment,
    recipientsCount: r.recipients_count,
    createdAt: r.created_at,
  };
}

export async function listNewsletterLog(): Promise<NewsletterEntry[]> {
  const rows = await sql<NewsletterRow[]>`
    SELECT id, title, body, url, segment, recipients_count, created_at
    FROM newsletter_log
    ORDER BY id DESC
    LIMIT 50
  `;

  return rows.map(toEntry);
}

export type SendNewsletterInput = {
  title: string;
  body: string;
  url: string | null;
  segment: BroadcastSegment;
  sentBy: number;
};

export async function sendNewsletter(
  input: SendNewsletterInput
): Promise<NewsletterEntry | { error: string }> {
  const title = input.title.trim();
  const body = input.body.trim();

  if (!title || title.length > 100) {
    return { error: "Заголовок должен быть от 1 до 100 символов" };
  }

  if (!body || body.length > 500) {
    return { error: "Текст должен быть от 1 до 500 символов" };
  }

  const recipientsCount = await sendPushToSegment(input.segment, {
    title,
    body,
    url: input.url ?? undefined,
  });

  const rows = await sql<NewsletterRow[]>`
    INSERT INTO newsletter_log (title, body, url, segment, recipients_count, sent_by)
    VALUES (${title}, ${body}, ${input.url}, ${input.segment}, ${recipientsCount}, ${input.sentBy})
    RETURNING id, title, body, url, segment, recipients_count, created_at
  `;

  return toEntry(rows[0]);
}
