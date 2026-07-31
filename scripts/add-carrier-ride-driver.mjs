// Приоритетные фиксы CRM-модуля перевозчика: водитель назначается на
// КОНКРЕТНЫЙ рейс, а не навсегда на машину (carrier_users.vehicle_id
// больше не используется для этого — оставлен как есть для обратной
// совместимости, просто не читается новым кодом).
// Run with: node --env-file=.env scripts/add-carrier-ride-driver.mjs
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { ssl: "require", prepare: false, max: 1 });

async function columnExists(table, column) {
  const rows = await sql`
    SELECT 1 FROM information_schema.columns WHERE table_name = ${table} AND column_name = ${column}
  `;
  return rows.length > 0;
}

async function main() {
  if (!(await columnExists("carrier_rides", "driver_user_id"))) {
    await sql`
      ALTER TABLE carrier_rides
      ADD COLUMN driver_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL
    `;
    console.log("carrier_rides.driver_user_id добавлена.");
  } else {
    console.log("carrier_rides.driver_user_id уже существует.");
  }

  console.log("Готово.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
