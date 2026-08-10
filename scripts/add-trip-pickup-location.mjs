// Место посадки для межгородних поездок — необязательное поле, которое
// водитель указывает при создании поездки (город from уже выбран, это
// конкретная точка встречи внутри него). Городских (city) поездок не
// касается — там точный адрес уже есть в from/to.
// Идемпотентно — можно запускать повторно без побочных эффектов.
// Run with: node --env-file=.env scripts/add-trip-pickup-location.mjs
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { ssl: "require", prepare: false, max: 1 });

async function columnExists(table, column) {
  const rows = await sql`
    SELECT 1 FROM information_schema.columns WHERE table_name = ${table} AND column_name = ${column}
  `;
  return rows.length > 0;
}

async function main() {
  if (!(await columnExists("trips", "pickup_location"))) {
    await sql`ALTER TABLE trips ADD COLUMN pickup_location TEXT`;
    console.log("trips.pickup_location добавлена.");
  } else {
    console.log("trips.pickup_location уже существует.");
  }

  console.log("Готово.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
