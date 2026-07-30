// Создаёт запись первого VIP-перевозчика (ИП Лаптевы). Только метаданные —
// машины/расписание НЕ придумываются, заполняются позже из кабинета перевозчика.
// Run with: node --env-file=.env scripts/seed-laptevy-carrier.mjs
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { ssl: "require", prepare: false, max: 1 });

async function main() {
  const rows = await sql`
    INSERT INTO carriers (slug, name, tagline, verified, active)
    VALUES ('laptevy', 'ИП Лаптевы', 'Харабали ↔ Астрахань · регулярные рейсы каждый день', true, true)
    ON CONFLICT (slug) DO NOTHING
    RETURNING id
  `;

  if (rows[0]) {
    console.log(`Carrier "laptevy" created, id=${rows[0].id}.`);
  } else {
    console.log('Carrier "laptevy" already exists.');
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
