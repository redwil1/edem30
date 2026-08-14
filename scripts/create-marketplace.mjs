// Раздел "Барахолка" — локальная доска объявлений внутри Едем30.
// Переиспользует users/auth, conversations (direct-чат), reviews (расширяем),
// push, Supabase Storage — ничего не дублирует.
// Идемпотентно — можно запускать повторно без побочных эффектов.
// Run with: node --env-file=.env scripts/create-marketplace.mjs
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { ssl: "require", prepare: false, max: 1 });

async function columnExists(table, column) {
  const rows = await sql`
    SELECT 1 FROM information_schema.columns WHERE table_name = ${table} AND column_name = ${column}
  `;
  return rows.length > 0;
}

async function constraintExists(name) {
  const rows = await sql`SELECT 1 FROM pg_constraint WHERE conname = ${name}`;
  return rows.length > 0;
}

async function main() {
  await sql`
    CREATE TABLE IF NOT EXISTS marketplace_listings (
      id SERIAL PRIMARY KEY,
      owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK (type IN ('sell', 'buy', 'free', 'looking', 'exchange', 'service')),
      category TEXT NOT NULL CHECK (category IN ('auto', 'electronics', 'home', 'clothes', 'services', 'jobs', 'animals', 'other')),
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      price INTEGER,
      price_type TEXT NOT NULL DEFAULT 'fixed' CHECK (price_type IN ('fixed', 'negotiable', 'free')),
      city TEXT NOT NULL,
      condition TEXT CHECK (condition IN ('new', 'used')),
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'reserved', 'sold', 'archived')),
      urgent BOOLEAN NOT NULL DEFAULT false,
      exchange_possible BOOLEAN NOT NULL DEFAULT false,
      photo_urls TEXT[] NOT NULL DEFAULT '{}',
      deal_confirmed_owner BOOLEAN NOT NULL DEFAULT false,
      deal_confirmed_buyer_id INTEGER REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      updated_at TEXT NOT NULL DEFAULT to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      bumped_at TEXT NOT NULL DEFAULT to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    )
  `;
  console.log("marketplace_listings готова.");

  await sql`
    CREATE INDEX IF NOT EXISTS marketplace_listings_status_city_idx
    ON marketplace_listings (status, city, bumped_at DESC)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS marketplace_listings_owner_idx
    ON marketplace_listings (owner_id)
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS marketplace_favorites (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      listing_id INTEGER NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      PRIMARY KEY (user_id, listing_id)
    )
  `;
  console.log("marketplace_favorites готова.");

  await sql`
    CREATE TABLE IF NOT EXISTS marketplace_seller_follows (
      follower_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      seller_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      PRIMARY KEY (follower_id, seller_id)
    )
  `;
  console.log("marketplace_seller_follows готова.");

  await sql`
    CREATE TABLE IF NOT EXISTS marketplace_saved_searches (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      query TEXT NOT NULL DEFAULT '',
      category TEXT,
      city TEXT,
      price_min INTEGER,
      price_max INTEGER,
      notify BOOLEAN NOT NULL DEFAULT true,
      created_at TEXT NOT NULL DEFAULT to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      last_notified_at TEXT
    )
  `;
  console.log("marketplace_saved_searches готова.");

  await sql`
    CREATE TABLE IF NOT EXISTS marketplace_reports (
      id SERIAL PRIMARY KEY,
      listing_id INTEGER NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
      reporter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category TEXT NOT NULL CHECK (category IN ('fraud', 'prohibited', 'spam', 'wrong_info', 'other')),
      description TEXT,
      created_at TEXT NOT NULL DEFAULT to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      seen_at TEXT
    )
  `;
  console.log("marketplace_reports готова.");

  await sql`
    CREATE TABLE IF NOT EXISTS marketplace_conversation_links (
      conversation_id INTEGER PRIMARY KEY REFERENCES conversations(id) ON DELETE CASCADE,
      listing_id INTEGER NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
      updated_at TEXT NOT NULL DEFAULT to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    )
  `;
  console.log("marketplace_conversation_links готова.");

  // --- расширяем существующую reviews под отзывы по объявлениям, без
  // затрагивания существующих строк (все они уже имеют trip_id).
  if (!(await columnExists("reviews", "listing_id"))) {
    await sql`ALTER TABLE reviews ADD COLUMN listing_id INTEGER REFERENCES marketplace_listings(id) ON DELETE CASCADE`;
    console.log("reviews.listing_id добавлена.");
  } else {
    console.log("reviews.listing_id уже существует.");
  }

  await sql`ALTER TABLE reviews ALTER COLUMN trip_id DROP NOT NULL`;

  if (!(await constraintExists("reviews_context_check"))) {
    await sql`
      ALTER TABLE reviews ADD CONSTRAINT reviews_context_check CHECK (
        (trip_id IS NOT NULL AND listing_id IS NULL) OR (trip_id IS NULL AND listing_id IS NOT NULL)
      )
    `;
    console.log("reviews_context_check добавлен.");
  } else {
    console.log("reviews_context_check уже существует.");
  }

  if (!(await constraintExists("reviews_listing_id_reviewer_id_key"))) {
    await sql`
      ALTER TABLE reviews ADD CONSTRAINT reviews_listing_id_reviewer_id_key UNIQUE (listing_id, reviewer_id)
    `;
    console.log("reviews_listing_id_reviewer_id_key добавлен.");
  } else {
    console.log("reviews_listing_id_reviewer_id_key уже существует.");
  }

  if (!(await columnExists("users", "marketplace_banned"))) {
    await sql`ALTER TABLE users ADD COLUMN marketplace_banned BOOLEAN NOT NULL DEFAULT false`;
    console.log("users.marketplace_banned добавлена.");
  } else {
    console.log("users.marketplace_banned уже существует.");
  }

  await ensureBucket();

  console.log("Готово.");
}

async function ensureBucket() {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.log("SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY не заданы — бакет marketplace-photos придётся создать вручную.");
    return;
  }

  const res = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id: "marketplace-photos", name: "marketplace-photos", public: true }),
  });

  if (res.ok) {
    console.log("Бакет marketplace-photos создан (public).");
    return;
  }

  const text = await res.text();
  if (res.status === 409 || text.includes("already exists")) {
    console.log("Бакет marketplace-photos уже существует.");
    return;
  }

  console.error("Не удалось создать бакет marketplace-photos:", res.status, text);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
