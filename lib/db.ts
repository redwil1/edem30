import "server-only";

import postgres from "postgres";

const globalForDb = globalThis as unknown as {
  sql: ReturnType<typeof postgres> | undefined;
};

function createSql() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL must be set");
  }

  // Supabase's pooled connection (port 6543) runs PgBouncer in transaction
  // mode, which doesn't guarantee the same backend connection across
  // statements — postgres.js's default prepared statements can then
  // reference a statement name that no longer exists. Disable them.
  return postgres(connectionString, { ssl: "require", prepare: false });
}

export const sql = globalForDb.sql ?? createSql();

if (process.env.NODE_ENV !== "production") {
  globalForDb.sql = sql;
}
