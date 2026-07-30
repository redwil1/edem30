import "server-only";

import { sql } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { clusterRideRequests, listOpenRideRequests, RideRequestCluster } from "@/lib/rideRequests";
import { sendPushToUser } from "@/lib/push";

export type Carrier = {
  id: number;
  slug: string;
  name: string;
  tagline: string | null;
  verified: boolean;
  active: boolean;
};

export async function getCarrierBySlug(slug: string): Promise<Carrier | null> {
  const rows = await sql<Carrier[]>`
    SELECT id, slug, name, tagline, verified, active
    FROM carriers WHERE slug = ${slug} AND active = true
  `;
  return rows[0] ?? null;
}

export async function getCarrierById(id: number): Promise<Carrier | null> {
  const rows = await sql<Carrier[]>`
    SELECT id, slug, name, tagline, verified, active FROM carriers WHERE id = ${id}
  `;
  return rows[0] ?? null;
}

export async function listCarriers(): Promise<Carrier[]> {
  return sql<Carrier[]>`SELECT id, slug, name, tagline, verified, active FROM carriers ORDER BY id ASC`;
}

/** Перевозчик, к которому привязан текущий залогиненный пользователь (кабинет). */
export async function requireCarrierOperator(): Promise<{ userId: number; carrier: Carrier } | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const rows = await sql<{ carrierId: number }[]>`
    SELECT carrier_id as "carrierId" FROM carrier_users WHERE user_id = ${user.id}
  `;

  const link = rows[0];
  if (!link) return null;

  const carrier = await getCarrierById(link.carrierId);
  if (!carrier || !carrier.active) return null;

  return { userId: user.id, carrier };
}

export type CarrierVehicle = {
  id: number;
  carrierId: number;
  label: string;
  make: string | null;
  model: string | null;
  plate: string | null;
  showPlate: boolean;
  seats: number;
  active: boolean;
};

const VEHICLE_SELECT = sql`
  SELECT id, carrier_id as "carrierId", label, make, model, plate,
         show_plate as "showPlate", seats, active
  FROM carrier_vehicles
`;

export async function listVehicles(carrierId: number, activeOnly = false): Promise<CarrierVehicle[]> {
  return sql<CarrierVehicle[]>`
    ${VEHICLE_SELECT}
    WHERE carrier_id = ${carrierId}
    ${activeOnly ? sql`AND active = true` : sql``}
    ORDER BY id ASC
  `;
}

export async function createVehicle(
  carrierId: number,
  input: { label: string; make?: string; model?: string; plate?: string; showPlate: boolean; seats: number }
): Promise<number> {
  const [row] = await sql<{ id: number }[]>`
    INSERT INTO carrier_vehicles (carrier_id, label, make, model, plate, show_plate, seats)
    VALUES (${carrierId}, ${input.label}, ${input.make ?? null}, ${input.model ?? null},
            ${input.plate ?? null}, ${input.showPlate}, ${input.seats})
    RETURNING id
  `;
  return row.id;
}

export async function setVehicleActive(carrierId: number, vehicleId: number, active: boolean): Promise<void> {
  await sql`UPDATE carrier_vehicles SET active = ${active} WHERE id = ${vehicleId} AND carrier_id = ${carrierId}`;
}

export type CarrierSchedule = {
  id: number;
  carrierId: number;
  vehicleId: number;
  fromCity: string;
  toCity: string;
  departureTime: string;
  daysOfWeek: string; // напр. "1,2,3,4,5,6,7" (1=Пн..7=Вс)
  price: number;
  active: boolean;
};

const SCHEDULE_SELECT = sql`
  SELECT id, carrier_id as "carrierId", vehicle_id as "vehicleId", from_city as "fromCity",
         to_city as "toCity", departure_time as "departureTime", days_of_week as "daysOfWeek",
         price, active
  FROM carrier_schedules
`;

export async function listSchedules(carrierId: number, activeOnly = false): Promise<CarrierSchedule[]> {
  return sql<CarrierSchedule[]>`
    ${SCHEDULE_SELECT}
    WHERE carrier_id = ${carrierId}
    ${activeOnly ? sql`AND active = true` : sql``}
    ORDER BY departure_time ASC
  `;
}

export async function createSchedule(
  carrierId: number,
  input: {
    vehicleId: number;
    fromCity: string;
    toCity: string;
    departureTime: string;
    daysOfWeek: string;
    price: number;
  }
): Promise<number> {
  const [row] = await sql<{ id: number }[]>`
    INSERT INTO carrier_schedules (carrier_id, vehicle_id, from_city, to_city, departure_time, days_of_week, price)
    VALUES (${carrierId}, ${input.vehicleId}, ${input.fromCity}, ${input.toCity}, ${input.departureTime},
            ${input.daysOfWeek}, ${input.price})
    RETURNING id
  `;
  return row.id;
}

export async function setScheduleActive(carrierId: number, scheduleId: number, active: boolean): Promise<void> {
  await sql`UPDATE carrier_schedules SET active = ${active} WHERE id = ${scheduleId} AND carrier_id = ${carrierId}`;
}

export type CarrierRideStatus = "open" | "full" | "departed" | "completed" | "cancelled";

export type CarrierRide = {
  id: number;
  carrierId: number;
  scheduleId: number | null;
  vehicleId: number;
  vehicleLabel: string;
  fromCity: string;
  toCity: string;
  rideDate: string;
  departureTime: string;
  price: number;
  totalSeats: number;
  occupiedSeats: number;
  status: CarrierRideStatus;
};

const RIDE_SELECT = sql`
  SELECT r.id as "id", r.carrier_id as "carrierId", r.schedule_id as "scheduleId",
         r.vehicle_id as "vehicleId", v.label as "vehicleLabel",
         r.from_city as "fromCity", r.to_city as "toCity", r.ride_date as "rideDate",
         r.departure_time as "departureTime", r.price as "price",
         r.total_seats as "totalSeats", r.occupied_seats as "occupiedSeats", r.status as "status"
  FROM carrier_rides r
  JOIN carrier_vehicles v ON v.id = r.vehicle_id
`;

function isoDayOfWeek(dateStr: string): number {
  const day = new Date(`${dateStr}T00:00:00Z`).getUTCDay();
  return day === 0 ? 7 : day;
}

function dateStrOffset(daysFromToday: number): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + daysFromToday);
  return d.toISOString().slice(0, 10);
}

/**
 * Материализует конкретные рейсы на диапазон дат из активных расписаний —
 * лениво, по требованию (не создаёт тысячи записей заранее). Идемпотентно:
 * повторный вызов на ту же дату ничего не дублирует (UNIQUE(schedule_id, ride_date)).
 */
export async function ensureRidesForDateRange(carrierId: number, daysAhead: number): Promise<void> {
  const schedules = await listSchedules(carrierId, true);
  if (schedules.length === 0) return;

  for (let offset = 0; offset <= daysAhead; offset++) {
    const dateStr = dateStrOffset(offset);
    const dow = isoDayOfWeek(dateStr);

    for (const schedule of schedules) {
      const days = schedule.daysOfWeek.split(",").map((d) => Number(d.trim()));
      if (!days.includes(dow)) continue;

      const vehicleRows = await sql<{ seats: number; active: boolean }[]>`
        SELECT seats, active FROM carrier_vehicles WHERE id = ${schedule.vehicleId}
      `;
      const vehicle = vehicleRows[0];
      if (!vehicle || !vehicle.active) continue;

      await sql`
        INSERT INTO carrier_rides
          (carrier_id, schedule_id, vehicle_id, from_city, to_city, ride_date, departure_time, price, total_seats)
        VALUES (${carrierId}, ${schedule.id}, ${schedule.vehicleId}, ${schedule.fromCity}, ${schedule.toCity},
                ${dateStr}, ${schedule.departureTime}, ${schedule.price}, ${vehicle.seats})
        ON CONFLICT (schedule_id, ride_date) WHERE schedule_id IS NOT NULL DO NOTHING
      `;
    }
  }
}

export async function listRidesForCarrier(
  carrierId: number,
  opts: { fromDate: string; toDate: string; publicOnly?: boolean }
): Promise<CarrierRide[]> {
  return sql<CarrierRide[]>`
    ${RIDE_SELECT}
    WHERE r.carrier_id = ${carrierId}
      AND r.ride_date >= ${opts.fromDate} AND r.ride_date <= ${opts.toDate}
      ${opts.publicOnly ? sql`AND r.status IN ('open', 'full')` : sql``}
    ORDER BY r.ride_date ASC, r.departure_time ASC, r.id ASC
  `;
}

export async function getCarrierRide(rideId: number): Promise<CarrierRide | null> {
  const rows = await sql<CarrierRide[]>`
    ${RIDE_SELECT}
    WHERE r.id = ${rideId}
  `;
  return rows[0] ?? null;
}

export type SeatAdjustResult =
  | { ok: true; ride: CarrierRide }
  | { ok: false; reason: "not_found" | "out_of_range" };

/**
 * Атомарное изменение занятых мест: один UPDATE с проверкой границ в WHERE —
 * Postgres сериализует конкурентные апдейты на уровне строки, поэтому два
 * одновременных запроса никогда не потеряют изменение и не выйдут за
 * пределы [0, total_seats] (тот же приём, что и в fulfillRideRequests).
 */
export async function adjustSeats(carrierId: number, rideId: number, delta: number): Promise<SeatAdjustResult> {
  const rows = await sql<{ id: number }[]>`
    UPDATE carrier_rides
    SET occupied_seats = occupied_seats + ${delta},
        status = CASE
          WHEN occupied_seats + ${delta} >= total_seats THEN 'full'
          WHEN status = 'full' AND occupied_seats + ${delta} < total_seats THEN 'open'
          ELSE status
        END
    WHERE id = ${rideId} AND carrier_id = ${carrierId}
      AND status NOT IN ('departed', 'completed', 'cancelled')
      AND occupied_seats + ${delta} >= 0
      AND occupied_seats + ${delta} <= total_seats
    RETURNING id
  `;

  if (rows.length === 0) {
    const exists = await getCarrierRide(rideId);
    if (!exists || exists.carrierId !== carrierId) return { ok: false, reason: "not_found" };
    return { ok: false, reason: "out_of_range" };
  }

  const ride = await getCarrierRide(rideId);
  return { ok: true, ride: ride! };
}

export function freeSeats(ride: CarrierRide): number {
  return Math.max(0, ride.totalSeats - ride.occupiedSeats);
}

/** Ближайший реальный рейс перевозчика — для блока на главной и в поиске. */
export async function getNearestPublicRide(carrierId: number, daysAhead = 14): Promise<CarrierRide | null> {
  await ensureRidesForDateRange(carrierId, daysAhead);

  const today = dateStrOffset(0);
  const end = dateStrOffset(daysAhead);

  const rides = await listRidesForCarrier(carrierId, { fromDate: today, toDate: end, publicOnly: true });
  const now = new Date();

  const upcoming = rides.filter((r) => {
    if (r.rideDate > today) return true;
    if (r.rideDate < today) return false;
    const [h, m] = r.departureTime.split(":").map(Number);
    const rideTime = new Date();
    rideTime.setHours(h, m, 0, 0);
    return rideTime.getTime() > now.getTime();
  });

  return upcoming[0] ?? null;
}

export type CarrierHighlight = {
  carrier: Carrier;
  ride: CarrierRide | null;
};

export async function listCarrierHighlights(): Promise<CarrierHighlight[]> {
  const carriers = await listCarriers();
  const active = carriers.filter((c) => c.active);

  const highlights = await Promise.all(
    active.map(async (carrier) => ({
      carrier,
      ride: await getNearestPublicRide(carrier.id),
    }))
  );

  return highlights.filter((h) => h.ride !== null);
}

export async function recordPageView(carrierId: number): Promise<void> {
  await sql`INSERT INTO carrier_page_views (carrier_id) VALUES (${carrierId})`;
}

export type CarrierTodayStats = {
  views: number;
  interests: number;
  offers: number;
  ridesToday: number;
};

export async function getCarrierTodayStats(carrierId: number): Promise<CarrierTodayStats> {
  const [views, interests, offers, rides] = await Promise.all([
    sql<{ c: string }[]>`
      SELECT COUNT(*) as c FROM carrier_page_views
      WHERE carrier_id = ${carrierId} AND created_at >= date_trunc('day', now())
    `,
    sql<{ c: string }[]>`
      SELECT COUNT(*) as c FROM carrier_ride_interests i
      JOIN carrier_rides r ON r.id = i.carrier_ride_id
      WHERE r.carrier_id = ${carrierId} AND i.created_at >= date_trunc('day', now())
    `,
    sql<{ c: string }[]>`
      SELECT COUNT(*) as c FROM carrier_ride_offers o
      JOIN carrier_rides r ON r.id = o.carrier_ride_id
      WHERE r.carrier_id = ${carrierId} AND o.created_at >= date_trunc('day', now())
    `,
    sql<{ c: string }[]>`
      SELECT COUNT(*) as c FROM carrier_rides
      WHERE carrier_id = ${carrierId} AND ride_date = ${dateStrOffset(0)}
    `,
  ]);

  return {
    views: Number(views[0].c),
    interests: Number(interests[0].c),
    offers: Number(offers[0].c),
    ridesToday: Number(rides[0].c),
  };
}

export type InterestResult = { ok: true; alreadyExists: boolean } | { ok: false; reason: "not_found" };

/** Пассажир жмёт «Хочу поехать» на конкретный рейс перевозчика (без оплаты — первая версия). */
export async function registerRideInterest(rideId: number, userId: number): Promise<InterestResult> {
  const ride = await getCarrierRide(rideId);
  if (!ride) return { ok: false, reason: "not_found" };

  const rows = await sql<{ id: number }[]>`
    INSERT INTO carrier_ride_interests (carrier_ride_id, user_id)
    VALUES (${rideId}, ${userId})
    ON CONFLICT (carrier_ride_id, user_id) DO NOTHING
    RETURNING id
  `;

  return { ok: true, alreadyExists: rows.length === 0 };
}

const TIME_TO_MIN = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

/**
 * Кластеры "Ищу водителя" (существующий clusterRideRequests, только чтение),
 * которые подходят под маршруты перевозчика — для карточки "🔥 Подходящая
 * заявка" в кабинете. Ничего не меняет в ride_requests.
 */
export async function findMatchingRideRequestClusters(carrierId: number): Promise<
  { cluster: RideRequestCluster; carrierRide: CarrierRide }[]
> {
  const schedules = await listSchedules(carrierId, true);
  if (schedules.length === 0) return [];

  const open = await listOpenRideRequests();
  const clusters = clusterRideRequests(open);
  if (clusters.length === 0) return [];

  const todayStr = dateStrOffset(0);
  const rangeEnd = dateStrOffset(7);
  const rides = await listRidesForCarrier(carrierId, { fromDate: todayStr, toDate: rangeEnd, publicOnly: true });

  const results: { cluster: RideRequestCluster; carrierRide: CarrierRide }[] = [];

  for (const cluster of clusters) {
    const match = rides.find(
      (r) =>
        r.fromCity === cluster.from &&
        r.toCity === cluster.to &&
        r.rideDate === cluster.date &&
        Math.abs(TIME_TO_MIN(r.departureTime) - TIME_TO_MIN(cluster.time)) <= 30 &&
        freeSeats(r) > 0
    );

    if (match) results.push({ cluster, carrierRide: match });
  }

  return results;
}

/**
 * Лаптевы предлагают места под кластер заявок: фиксируем оффер (для дедупа
 * push и статистики "заявок") и шлём push только тем пассажирам, кому ещё
 * не предлагали именно этот рейс — существующим sendPushToUser, без новой
 * push-системы.
 */
export async function offerRideToCluster(
  carrierRideId: number,
  cluster: RideRequestCluster
): Promise<number> {
  const ride = await getCarrierRide(carrierRideId);
  if (!ride) return 0;

  const carrier = await getCarrierById(ride.carrierId);
  if (!carrier) return 0;

  let notified = 0;

  for (const request of cluster.requests) {
    const rows = await sql<{ id: number }[]>`
      INSERT INTO carrier_ride_offers (carrier_ride_id, ride_request_id)
      VALUES (${carrierRideId}, ${request.id})
      ON CONFLICT (carrier_ride_id, ride_request_id) DO NOTHING
      RETURNING id
    `;

    if (rows.length === 0) continue; // уже предлагали именно этот рейс этой заявке

    notified++;
    sendPushToUser(request.passengerId, {
      title: "🚌 Найден подходящий рейс",
      body: `${carrier.name}: ${ride.fromCity} → ${ride.toCity} в ${ride.departureTime}. Есть свободные места.`,
      url: `/carrier/${carrier.slug}`,
    });
  }

  return notified;
}
