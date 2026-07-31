// Email-резерв для критичных уведомлений о статусе поездки: если у
// получателя нет активной push-подписки, но есть подтверждённая почта —
// дублируем уведомление на email. Включено по умолчанию всем (это
// транзакционное уведомление о своей же поездке, не реклама), но можно
// выключить в настройках профиля.
// Идемпотентно — можно запускать повторно без побочных эффектов.
// Run with: node --env-file=.env scripts/add-email-notify-fallback.mjs
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { ssl: "require", prepare: false, max: 1 });

async function columnExists(table, column) {
  const rows = await sql`
    SELECT 1 FROM information_schema.columns WHERE table_name = ${table} AND column_name = ${column}
  `;
  return rows.length > 0;
}

async function main() {
  if (!(await columnExists("users", "email_notify_fallback"))) {
    await sql`ALTER TABLE users ADD COLUMN email_notify_fallback BOOLEAN NOT NULL DEFAULT true`;
    console.log("users.email_notify_fallback добавлена (по умолчанию true).");
  } else {
    console.log("users.email_notify_fallback уже существует.");
  }

  console.log("Готово.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
