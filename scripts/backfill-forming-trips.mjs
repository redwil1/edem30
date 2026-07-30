// Одноразовый бэкафилл: у существующих открытых заявок "Ищу водителя"
// (созданных до перехода на модель "формирующаяся поездка = trips-ряд с
// owner_id = NULL") ещё нет trip_id. Группирует их так же, как
// lib/rideRequests.ts::clusterRideRequests (маршрут+дата, время в пределах
// 30 минут последовательно), создаёт по одной формирующейся поездке на
// группу и проставляет trip_id — дальше эти заявки живут по новой схеме.
// Run with: node --env-file=.env scripts/backfill-forming-trips.mjs
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { ssl: "require", prepare: false, max: 1 });

function timeToMinutes(time) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

async function main() {
  const open = await sql`
    SELECT id, passenger_id, from_city, to_city, trip_date, trip_time, passengers_count
    FROM ride_requests WHERE status = 'open' AND trip_id IS NULL
    ORDER BY created_at ASC
  `;

  if (open.length === 0) {
    console.log("Нет заявок для бэкафилла.");
    return;
  }

  const byRoute = new Map();
  for (const r of open) {
    const key = `${r.from_city}|${r.to_city}|${r.trip_date}`;
    const list = byRoute.get(key);
    if (list) list.push(r);
    else byRoute.set(key, [r]);
  }

  let createdCount = 0;

  for (const group of byRoute.values()) {
    const sorted = [...group].sort((a, b) => timeToMinutes(a.trip_time) - timeToMinutes(b.trip_time));
    let current = [];

    async function flush(cluster) {
      if (cluster.length === 0) return;

      const first = cluster[0];
      const totalSeats = cluster.reduce((sum, r) => sum + r.passengers_count, 0);

      const [trip] = await sql`
        INSERT INTO trips (type, from_city, to_city, trip_date, trip_time, price, total_seats, transport, driver_name, owner_id, verified)
        VALUES ('intercity', ${first.from_city}, ${first.to_city}, ${first.trip_date}, ${first.trip_time}, 0, ${totalSeats}, '', '', NULL, 0)
        RETURNING id
      `;

      for (const r of cluster) {
        await sql`INSERT INTO trip_participants (trip_id, user_id) VALUES (${trip.id}, ${r.passenger_id}) ON CONFLICT DO NOTHING`;
        await sql`UPDATE ride_requests SET trip_id = ${trip.id} WHERE id = ${r.id}`;
      }

      console.log(`Создана формирующаяся поездка ${trip.id}: ${first.from_city} -> ${first.to_city}, ${cluster.length} заявок.`);
      createdCount++;
    }

    for (const r of sorted) {
      const last = current[current.length - 1];
      if (last && timeToMinutes(r.trip_time) - timeToMinutes(last.trip_time) > 30) {
        await flush(current);
        current = [r];
      } else {
        current.push(r);
      }
    }

    await flush(current);
  }

  console.log(`Готово. Создано формирующихся поездок: ${createdCount}.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
