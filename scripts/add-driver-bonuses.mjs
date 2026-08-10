// Бонусы водителям за реально совершённые поездки (100 ₽ за пассажира,
// который подтвердил завершение поездки). Одна строка = один пассажир на
// одной поездке — гарантирует, что бонус за пассажира начисляется ровно
// один раз (UNIQUE(trip_id, passenger_id)).
// Идемпотентно — можно запускать повторно без побочных эффектов.
// Run with: node --env-file=.env scripts/add-driver-bonuses.mjs
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { ssl: "require", prepare: false, max: 1 });

async function main() {
  await sql`
    CREATE TABLE IF NOT EXISTS driver_bonuses (
      id SERIAL PRIMARY KEY,
      trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
      driver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      passenger_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount INTEGER NOT NULL DEFAULT 100,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'rejected')),
      admin_note TEXT,
      approved_at TIMESTAMPTZ,
      approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      paid_at TIMESTAMPTZ,
      paid_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      rejected_at TIMESTAMPTZ,
      rejected_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (trip_id, passenger_id)
    )
  `;
  console.log("driver_bonuses готова.");

  await sql`CREATE INDEX IF NOT EXISTS driver_bonuses_driver_idx ON driver_bonuses (driver_id)`;
  await sql`CREATE INDEX IF NOT EXISTS driver_bonuses_status_idx ON driver_bonuses (status)`;
  await sql`CREATE INDEX IF NOT EXISTS driver_bonuses_trip_idx ON driver_bonuses (trip_id)`;
  console.log("Индексы готовы.");

  console.log("Готово.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
