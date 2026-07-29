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
  //
  // On Vercel each serverless instance gets its own client (module scope is
  // per-container, not shared globally), and postgres.js defaults to up to
  // 10 pooled connections per client — with many concurrent instances that
  // can blow past PgBouncer's own client-connection cap. Since PgBouncer
  // already does the real pooling, cap each client well below the default.
  //
  // Capping at 1 (an earlier attempt) backfired: a single logged-in page
  // load fires ~10 concurrent requests (notification bell, chat, trip/order
  // notifiers, online heartbeat, ...), each hitting a route that queries the
  // DB. With max:1 they all serialize behind one connection on the same
  // warm instance, so a single slow query head-of-line-blocks everything
  // else, including auth — the whole page can appear to hang. A small pool
  // still bounds total connections across instances while letting a page's
  // own concurrent requests run in parallel instead of queueing.
  return postgres(connectionString, {
    ssl: "require",
    prepare: false,
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
  });
}

export const sql = globalForDb.sql ?? createSql();

if (process.env.NODE_ENV !== "production") {
  globalForDb.sql = sql;
}
