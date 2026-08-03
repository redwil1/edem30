// Подтверждение номера телефона звонком (Flash Call) при регистрации —
// до создания аккаунта, поэтому код привязан к номеру, а не к user_id.
// Идемпотентно — можно запускать повторно без побочных эффектов.
// Run with: node --env-file=.env scripts/add-phone-registration-codes.mjs
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { ssl: "require", prepare: false, max: 1 });

async function main() {
  await sql`
    CREATE TABLE IF NOT EXISTS phone_registration_codes (
      id SERIAL PRIMARY KEY,
      phone TEXT NOT NULL,
      code TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  console.log("phone_registration_codes готова.");

  await sql`
    CREATE INDEX IF NOT EXISTS phone_registration_codes_phone_idx ON phone_registration_codes (phone)
  `;
  console.log("Индекс готов.");

  console.log("Готово.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
