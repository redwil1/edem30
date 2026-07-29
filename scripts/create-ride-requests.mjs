// Заявки пассажиров "ищу водителя" — зеркало таблицы trips, но со стороны пассажира.
// Run with: node --env-file=.env scripts/create-ride-requests.mjs
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { ssl: "require", prepare: false, max: 1 });

async function main() {
  await sql`
    CREATE TABLE IF NOT EXISTS ride_requests (
      id SERIAL PRIMARY KEY,
      passenger_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      from_city TEXT NOT NULL,
      to_city TEXT NOT NULL,
      trip_date TEXT NOT NULL,
      trip_time TEXT NOT NULL,
      passengers_count INTEGER NOT NULL DEFAULT 1,
      comment TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      accepted_driver_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      closed_at TIMESTAMPTZ
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_ride_requests_status ON ride_requests (status, trip_date)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_ride_requests_passenger ON ride_requests (passenger_id)
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS ride_request_responses (
      id SERIAL PRIMARY KEY,
      request_id INTEGER NOT NULL REFERENCES ride_requests(id) ON DELETE CASCADE,
      driver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (request_id, driver_id)
    )
  `;

  console.log("ride_requests / ride_request_responses ready.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
