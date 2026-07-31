// Этап 1 модуля "Перевозчики" — внутренние роли сотрудников (менеджер/
// оператор/водитель), привязка водителя к машине, связь carrier_rides с
// обычными trips (для чата/страницы поездки пассажиров Едем30) и таблица
// реальных бронирований carrier_bookings (телефонные + через приложение).
// Идемпотентно — можно запускать повторно без побочных эффектов.
// Run with: node --env-file=.env scripts/add-carrier-crm.mjs
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { ssl: "require", prepare: false, max: 1 });

async function columnExists(table, column) {
  const rows = await sql`
    SELECT 1 FROM information_schema.columns
    WHERE table_name = ${table} AND column_name = ${column}
  `;
  return rows.length > 0;
}

async function constraintExists(name) {
  const rows = await sql`SELECT 1 FROM pg_constraint WHERE conname = ${name}`;
  return rows.length > 0;
}

async function main() {
  // --- carrier_users: внутренние роли сотрудников ---
  if (!(await columnExists("carrier_users", "role"))) {
    await sql`ALTER TABLE carrier_users ADD COLUMN role TEXT NOT NULL DEFAULT 'manager'`;
    console.log("carrier_users.role добавлена (существующие записи -> 'manager').");
  } else {
    console.log("carrier_users.role уже существует.");
  }

  if (!(await constraintExists("carrier_users_role_check"))) {
    await sql`
      ALTER TABLE carrier_users
      ADD CONSTRAINT carrier_users_role_check CHECK (role IN ('manager', 'operator', 'driver'))
    `;
    console.log("carrier_users_role_check добавлен.");
  }

  if (!(await columnExists("carrier_users", "vehicle_id"))) {
    await sql`
      ALTER TABLE carrier_users
      ADD COLUMN vehicle_id INTEGER REFERENCES carrier_vehicles(id) ON DELETE SET NULL
    `;
    console.log("carrier_users.vehicle_id добавлена.");
  } else {
    console.log("carrier_users.vehicle_id уже существует.");
  }

  // --- carrier_rides: связь с обычной поездкой Едем30 (чат/страница/участники) ---
  if (!(await columnExists("carrier_rides", "trip_id"))) {
    await sql`
      ALTER TABLE carrier_rides
      ADD COLUMN trip_id INTEGER UNIQUE REFERENCES trips(id) ON DELETE SET NULL
    `;
    console.log("carrier_rides.trip_id добавлена (UNIQUE — один carrier_ride = максимум один trips).");
  } else {
    console.log("carrier_rides.trip_id уже существует.");
  }

  // --- carrier_bookings: единственный источник данных о конкретных пассажирах ---
  await sql`
    CREATE TABLE IF NOT EXISTS carrier_bookings (
      id SERIAL PRIMARY KEY,
      carrier_ride_id INTEGER NOT NULL REFERENCES carrier_rides(id) ON DELETE CASCADE,
      seats INTEGER NOT NULL CHECK (seats > 0),
      passenger_name TEXT NOT NULL,
      passenger_phone TEXT,
      pickup TEXT,
      dropoff TEXT,
      comment TEXT,
      source TEXT NOT NULL CHECK (source IN ('operator', 'edem30')),
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  console.log("carrier_bookings готова.");

  await sql`
    CREATE INDEX IF NOT EXISTS carrier_bookings_active_ride_idx
    ON carrier_bookings (carrier_ride_id)
    WHERE status = 'active'
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS carrier_bookings_user_idx
    ON carrier_bookings (user_id)
    WHERE user_id IS NOT NULL
  `;
  console.log("Индексы carrier_bookings готовы.");

  console.log("Этап 1 готов.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
