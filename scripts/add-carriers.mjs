// VIP-перевозчики (первый — ИП Лаптевы): отдельная сущность поверх users,
// не трогает существующие роли/поездки/ride_requests.
// Run with: node --env-file=.env scripts/add-carriers.mjs
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { ssl: "require", prepare: false, max: 1 });

async function main() {
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_vip BOOLEAN NOT NULL DEFAULT false`;

  await sql`
    CREATE TABLE IF NOT EXISTS carriers (
      id SERIAL PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      tagline TEXT,
      verified BOOLEAN NOT NULL DEFAULT true,
      active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS carrier_users (
      id SERIAL PRIMARY KEY,
      carrier_id INTEGER NOT NULL REFERENCES carriers(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS carrier_vehicles (
      id SERIAL PRIMARY KEY,
      carrier_id INTEGER NOT NULL REFERENCES carriers(id) ON DELETE CASCADE,
      label TEXT NOT NULL,
      make TEXT,
      model TEXT,
      plate TEXT,
      show_plate BOOLEAN NOT NULL DEFAULT false,
      seats INTEGER NOT NULL,
      active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS carrier_schedules (
      id SERIAL PRIMARY KEY,
      carrier_id INTEGER NOT NULL REFERENCES carriers(id) ON DELETE CASCADE,
      vehicle_id INTEGER NOT NULL REFERENCES carrier_vehicles(id) ON DELETE CASCADE,
      from_city TEXT NOT NULL,
      to_city TEXT NOT NULL,
      departure_time TEXT NOT NULL,
      days_of_week TEXT NOT NULL,
      price INTEGER NOT NULL,
      active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS carrier_rides (
      id SERIAL PRIMARY KEY,
      carrier_id INTEGER NOT NULL REFERENCES carriers(id) ON DELETE CASCADE,
      schedule_id INTEGER REFERENCES carrier_schedules(id) ON DELETE SET NULL,
      vehicle_id INTEGER NOT NULL REFERENCES carrier_vehicles(id) ON DELETE CASCADE,
      from_city TEXT NOT NULL,
      to_city TEXT NOT NULL,
      ride_date TEXT NOT NULL,
      departure_time TEXT NOT NULL,
      price INTEGER NOT NULL,
      total_seats INTEGER NOT NULL,
      occupied_seats INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'open',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS carrier_rides_schedule_date_key ON carrier_rides(schedule_id, ride_date) WHERE schedule_id IS NOT NULL`;
  await sql`CREATE INDEX IF NOT EXISTS carrier_rides_route_date_idx ON carrier_rides(from_city, to_city, ride_date)`;

  await sql`
    CREATE TABLE IF NOT EXISTS carrier_ride_offers (
      id SERIAL PRIMARY KEY,
      carrier_ride_id INTEGER NOT NULL REFERENCES carrier_rides(id) ON DELETE CASCADE,
      ride_request_id INTEGER NOT NULL REFERENCES ride_requests(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE(carrier_ride_id, ride_request_id)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS carrier_ride_interests (
      id SERIAL PRIMARY KEY,
      carrier_ride_id INTEGER NOT NULL REFERENCES carrier_rides(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE(carrier_ride_id, user_id)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS carrier_page_views (
      id SERIAL PRIMARY KEY,
      carrier_id INTEGER NOT NULL REFERENCES carriers(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS carrier_page_views_carrier_idx ON carrier_page_views(carrier_id, created_at)`;

  console.log("carriers schema ready.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
