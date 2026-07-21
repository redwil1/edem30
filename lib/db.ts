import Database from "better-sqlite3";
import path from "path";

const globalForDb = globalThis as unknown as {
  db: Database.Database | undefined;
};

function createDb() {
  const dbPath = path.join(process.cwd(), "data", "app.db");

  const db = new Database(dbPath);

  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'passenger' CHECK (role IN ('passenger', 'driver')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS trip_participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      joined_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(trip_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS trips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK (type IN ('city', 'intercity')),
      from_city TEXT NOT NULL,
      to_city TEXT NOT NULL,
      trip_date TEXT NOT NULL,
      trip_time TEXT NOT NULL,
      price INTEGER NOT NULL,
      total_seats INTEGER NOT NULL,
      transport TEXT NOT NULL,
      driver_name TEXT NOT NULL,
      owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      rating REAL,
      reviews_count INTEGER,
      verified INTEGER NOT NULL DEFAULT 0,
      driver_confirmed_at TEXT,
      passenger_confirmed_at TEXT,
      driver_completed_at TEXT,
      passenger_completed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS taxi_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      passenger_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      from_address TEXT NOT NULL,
      to_address TEXT NOT NULL,
      price INTEGER NOT NULL,
      seats INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'accepted', 'cancelled')),
      driver_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      trip_id INTEGER REFERENCES trips(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_id INTEGER NOT NULL,
      reviewer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reviewee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      comment TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(trip_id, reviewer_id)
    );
  `);

  ensureUserRoleColumn(db);
  ensureAdminRoleSupport(db);
  ensureTripStartColumns(db);
  ensureTripLifecycleColumns(db);

  return db;
}

function ensureUserRoleColumn(db: Database.Database) {
  const columns = db.prepare("PRAGMA table_info(users)").all() as {
    name: string;
  }[];

  const hasRole = columns.some((column) => column.name === "role");

  if (!hasRole) {
    db.exec(
      "ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'passenger'"
    );
  }
}

function ensureAdminRoleSupport(db: Database.Database) {
  const row = db
    .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'users'")
    .get() as { sql: string } | undefined;

  if (!row || row.sql.includes("'admin'")) return;

  const tx = db.transaction(() => {
    db.exec(`
      CREATE TABLE users_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'passenger' CHECK (role IN ('passenger', 'driver', 'admin')),
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    db.exec(
      `INSERT INTO users_new (id, name, phone, password_hash, role, created_at)
       SELECT id, name, phone, password_hash, role, created_at FROM users;`
    );

    db.exec("DROP TABLE users;");
    db.exec("ALTER TABLE users_new RENAME TO users;");
  });

  tx();
}

function ensureTripStartColumns(db: Database.Database) {
  const columns = db.prepare("PRAGMA table_info(trips)").all() as {
    name: string;
  }[];

  const names = new Set(columns.map((column) => column.name));

  if (!names.has("driver_confirmed_at")) {
    db.exec("ALTER TABLE trips ADD COLUMN driver_confirmed_at TEXT");
  }

  if (!names.has("passenger_confirmed_at")) {
    db.exec("ALTER TABLE trips ADD COLUMN passenger_confirmed_at TEXT");
  }

  if (!names.has("driver_completed_at")) {
    db.exec("ALTER TABLE trips ADD COLUMN driver_completed_at TEXT");
  }

  if (!names.has("passenger_completed_at")) {
    db.exec("ALTER TABLE trips ADD COLUMN passenger_completed_at TEXT");
  }
}

function ensureTripLifecycleColumns(db: Database.Database) {
  const columns = db.prepare("PRAGMA table_info(trips)").all() as {
    name: string;
  }[];

  const names = new Set(columns.map((column) => column.name));

  if (!names.has("transport_category")) {
    db.exec("ALTER TABLE trips ADD COLUMN transport_category TEXT");
  }

  if (!names.has("cancelled_at")) {
    db.exec("ALTER TABLE trips ADD COLUMN cancelled_at TEXT");
  }

  if (!names.has("deal_price")) {
    db.exec("ALTER TABLE trips ADD COLUMN deal_price INTEGER");
  }

  if (!names.has("driver_deal_at")) {
    db.exec("ALTER TABLE trips ADD COLUMN driver_deal_at TEXT");
  }

  if (!names.has("passenger_deal_at")) {
    db.exec("ALTER TABLE trips ADD COLUMN passenger_deal_at TEXT");
  }
}

export const db = globalForDb.db ?? createDb();

if (process.env.NODE_ENV !== "production") {
  globalForDb.db = db;
}
