// Таблица истории постов в Одноклассники (группа "Харабали базарчик",
// ok.ru/kharabalibazar). Публикация идёт через ручную кнопку в админке —
// cron не используется. Идемпотентно — можно запускать повторно без
// побочных эффектов.
// Run with: node --env-file=.env scripts/create-ok-posts.mjs
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { ssl: "require", prepare: false, max: 1 });

async function main() {
  await sql`
    CREATE TABLE IF NOT EXISTS ok_posts (
      id SERIAL PRIMARY KEY,
      content TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      error TEXT,
      posted_by INTEGER REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      published_at TEXT
    )
  `;

  console.log("ok_posts готова.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
