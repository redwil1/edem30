// Добавляет статусы прочтения и вложения к чату поддержки.
// Run with: node --env-file=.env scripts/upgrade-support-chat.mjs
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { ssl: "require", prepare: false, max: 1 });

async function main() {
  await sql`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS user_last_read_at TIMESTAMPTZ`;
  await sql`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS staff_last_read_at TIMESTAMPTZ`;
  await sql`ALTER TABLE conversation_messages ADD COLUMN IF NOT EXISTS attachment_url TEXT`;
  await sql`ALTER TABLE conversation_messages ADD COLUMN IF NOT EXISTS attachment_type TEXT`;

  console.log("Support chat upgraded: read receipts + attachments columns ready.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
