// Настоящая карта мест: каждое место рейса привязывается к конкретной
// брони (а не просто к счётчику occupied_seats), чтобы SeatMap перестал
// быть декоративным — тап по месту показывает/бронирует/отменяет именно
// это место.
// Идемпотентно — можно запускать повторно без побочных эффектов.
// Run with: node --env-file=.env scripts/add-carrier-booking-seats.mjs
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { ssl: "require", prepare: false, max: 1 });

async function main() {
  await sql`
    CREATE TABLE IF NOT EXISTS carrier_booking_seats (
      id SERIAL PRIMARY KEY,
      carrier_ride_id INTEGER NOT NULL REFERENCES carrier_rides(id) ON DELETE CASCADE,
      seat_number INTEGER NOT NULL CHECK (seat_number > 0),
      booking_id INTEGER NOT NULL REFERENCES carrier_bookings(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (carrier_ride_id, seat_number)
    )
  `;
  console.log("carrier_booking_seats готова.");

  await sql`
    CREATE INDEX IF NOT EXISTS carrier_booking_seats_booking_idx
    ON carrier_booking_seats (booking_id)
  `;
  console.log("Индекс carrier_booking_seats_booking_idx готов.");

  // Бэкфилл: у рейсов, где брони появились до этой таблицы, occupied_seats
  // уже > 0, а строк в carrier_booking_seats нет — раскладываем существующие
  // активные брони по местам 1..N в порядке создания (детерминированно,
  // без реального физического смысла номера — как временная привязка,
  // дальше живёт как обычное место). Рейсы, где хотя бы одна строка уже
  // есть, пропускаем — считаем их уже обработанными.
  const ridesToBackfill = await sql`
    SELECT r.id, r.total_seats as "totalSeats" FROM carrier_rides r
    WHERE r.occupied_seats > 0
      AND NOT EXISTS (SELECT 1 FROM carrier_booking_seats s WHERE s.carrier_ride_id = r.id)
  `;

  let backfilledRides = 0;
  for (const ride of ridesToBackfill) {
    const bookings = await sql`
      SELECT id, seats FROM carrier_bookings
      WHERE carrier_ride_id = ${ride.id} AND status = 'active'
      ORDER BY created_at ASC
    `;

    let seatNumber = 1;
    for (const booking of bookings) {
      for (let i = 0; i < booking.seats; i++) {
        if (seatNumber > ride.totalSeats) break; // защита от рассинхронизации данных
        await sql`
          INSERT INTO carrier_booking_seats (carrier_ride_id, seat_number, booking_id)
          VALUES (${ride.id}, ${seatNumber}, ${booking.id})
          ON CONFLICT (carrier_ride_id, seat_number) DO NOTHING
        `;
        seatNumber++;
      }
    }
    backfilledRides++;
  }
  console.log(`Бэкфилл мест выполнен для ${backfilledRides} рейс(ов).`);

  console.log("Готово.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
