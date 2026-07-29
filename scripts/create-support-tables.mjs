// One-off script to create the support-chat tables against the Supabase Postgres instance.
// Run with: node --env-file=.env scripts/create-support-tables.mjs
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { ssl: "require", prepare: false });

async function main() {
  await sql`
    CREATE TABLE IF NOT EXISTS conversations (
      id SERIAL PRIMARY KEY,
      type TEXT NOT NULL DEFAULT 'support',
      subject_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      last_message_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  // One active support thread per user — future 'direct' (user<->user) conversations
  // won't set subject_user_id, so they fall outside this partial unique index.
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_support_subject
    ON conversations (subject_user_id)
    WHERE type = 'support'
  `;

  // Scaffold for future user<->user direct chats: membership rows so a single
  // "my conversations" query works for any conversation type, not just support.
  await sql`
    CREATE TABLE IF NOT EXISTS conversation_participants (
      conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      last_read_at TIMESTAMPTZ,
      PRIMARY KEY (conversation_id, user_id)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS conversation_messages (
      id SERIAL PRIMARY KEY,
      conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_conversation_messages_conversation
    ON conversation_messages (conversation_id, created_at)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_conversation_participants_user
    ON conversation_participants (user_id)
  `;

  console.log("Support chat tables ready.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
