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
  // else, including auth — the whole page can appear to hang. Actual usage
  // peaks well under 30 total connections (vs PgBouncer's 200-client cap),
  // so there's plenty of headroom for the default pool size.
  //
  // The real incident wasn't slow queries — pg_stat_activity showed sessions
  // stuck "active"/ClientRead for 5+ minutes: Postgres had already answered
  // and was waiting for the next command from a client that no longer
  // existed (its Vercel function got killed by the 300s execution limit
  // mid-request). PgBouncer never learns the client is gone, so it keeps
  // that backend connection assigned — statement_timeout doesn't help here,
  // since Postgres isn't executing anything, it's idle waiting on the
  // socket. Enough orphaned sessions piling up starves PgBouncer's backend
  // pool for every other request, unrelated ones included — this is what
  // took down login, admin, notifications, everything at once. The actual
  // fix is capping function execution time itself (see vercel.json
  // maxDuration) so a stuck request dies in ~20s instead of 300s, freeing
  // its connection back quickly instead of squatting on it for minutes.
  return postgres(connectionString, {
    ssl: "require",
    prepare: false,
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });
}

export const sql = globalForDb.sql ?? createSql();

if (process.env.NODE_ENV !== "production") {
  globalForDb.sql = sql;
}
