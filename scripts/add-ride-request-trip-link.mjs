// Связывает заявку "Ищу водителя" с реальной поездкой, когда водитель её формирует.
// Run with: node --env-file=.env scripts/add-ride-request-trip-link.mjs
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { ssl: "require", prepare: false, max: 1 });

async function main() {
  await sql`ALTER TABLE ride_requests ADD COLUMN IF NOT EXISTS trip_id INTEGER REFERENCES trips(id) ON DELETE SET NULL`;
  console.log("ride_requests.trip_id ready.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
