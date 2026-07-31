import "server-only";

import type postgres from "postgres";

import { sql } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { clusterRideRequests, listOpenRideRequests, RideRequestCluster } from "@/lib/rideRequests";
import { sendPushToUser } from "@/lib/push";
import { createTrip } from "@/lib/trips";

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

export type CarrierEmployeeRole = "manager" | "operator" | "driver";

/** Перевозчик, к которому привязан текущий залогиненный пользователь (кабинет), с его внутренней ролью. */
export async function requireCarrierOperator(): Promise<
  { userId: number; carrier: Carrier; role: CarrierEmployeeRole; vehicleId: number | null } | null
> {
  const user = await getCurrentUser();
  if (!user) return null;

  const rows = await sql<{ carrierId: number; role: CarrierEmployeeRole; vehicleId: number | null }[]>`
    SELECT carrier_id as "carrierId", role as "role", vehicle_id as "vehicleId"
    FROM carrier_users WHERE user_id = ${user.id}
  `;

  const link = rows[0];
  if (!link) return null;

  const carrier = await getCarrierById(link.carrierId);
  if (!carrier || !carrier.active) return null;

  return { userId: user.id, carrier, role: link.role, vehicleId: link.vehicleId };
}

/**
 * Только для чтения: даёт админу открыть чужой Business-кабинет для
 * просмотра (без права менять места/машины/расписание — это остаётся
 * только у оператора перевозчика через requireCarrierOperator).
 */
export async function getCarrierForAdminView(carrierId: number): Promise<Carrier | null> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return null;

  return getCarrierById(carrierId);
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
  tripId: number | null;
};

const RIDE_SELECT = sql`
  SELECT r.id as "id", r.carrier_id as "carrierId", r.schedule_id as "scheduleId",
         r.vehicle_id as "vehicleId", v.label as "vehicleLabel",
         r.from_city as "fromCity", r.to_city as "toCity", r.ride_date as "rideDate",
         r.departure_time as "departureTime", r.price as "price",
         r.total_seats as "totalSeats", r.occupied_seats as "occupiedSeats", r.status as "status",
         r.trip_id as "tripId"
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
  opts: { fromDate: string; toDate: string; publicOnly?: boolean; vehicleId?: number }
): Promise<CarrierRide[]> {
  return sql<CarrierRide[]>`
    ${RIDE_SELECT}
    WHERE r.carrier_id = ${carrierId}
      AND r.ride_date >= ${opts.fromDate} AND r.ride_date <= ${opts.toDate}
      ${opts.publicOnly ? sql`AND r.status IN ('open', 'full')` : sql``}
      ${opts.vehicleId ? sql`AND r.vehicle_id = ${opts.vehicleId}` : sql``}
    ORDER BY r.ride_date ASC, r.departure_time ASC, r.id ASC
  `;
}

export async function getBookingById(bookingId: number): Promise<CarrierBooking | null> {
  const rows = await sql<CarrierBooking[]>`
    ${BOOKING_SELECT}
    WHERE b.id = ${bookingId}
  `;
  return rows[0] ?? null;
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

const NOT_EDITABLE_STATUSES: CarrierRideStatus[] = ["departed", "completed", "cancelled"];

export type VehicleSwapResult =
  | { ok: true; ride: CarrierRide }
  | { ok: false; reason: "not_found" | "vehicle_not_found" | "too_small" | "not_editable" };

/**
 * Замена машины на уже созданном рейсе (сломалась/задержалась) — рейс и
 * записавшиеся пассажиры сохраняются, меняется только vehicle_id/total_seats.
 * Нельзя поставить машину с местами меньше уже занятых.
 */
export async function swapRideVehicle(
  carrierId: number,
  rideId: number,
  newVehicleId: number
): Promise<VehicleSwapResult> {
  const ride = await getCarrierRide(rideId);
  if (!ride || ride.carrierId !== carrierId) return { ok: false, reason: "not_found" };
  if (NOT_EDITABLE_STATUSES.includes(ride.status)) return { ok: false, reason: "not_editable" };

  const vehicles = await sql<{ seats: number }[]>`
    SELECT seats FROM carrier_vehicles WHERE id = ${newVehicleId} AND carrier_id = ${carrierId} AND active = true
  `;
  const vehicle = vehicles[0];
  if (!vehicle) return { ok: false, reason: "vehicle_not_found" };
  if (vehicle.seats < ride.occupiedSeats) return { ok: false, reason: "too_small" };

  await sql`
    UPDATE carrier_rides
    SET vehicle_id = ${newVehicleId}, total_seats = ${vehicle.seats},
        status = CASE
          WHEN occupied_seats >= ${vehicle.seats} THEN 'full'
          WHEN status = 'full' AND occupied_seats < ${vehicle.seats} THEN 'open'
          ELSE status
        END
    WHERE id = ${rideId} AND carrier_id = ${carrierId}
  `;

  const updated = await getCarrierRide(rideId);
  return { ok: true, ride: updated! };
}

export type CancelRideResult =
  | { ok: true; ride: CarrierRide }
  | { ok: false; reason: "not_found" | "already_done" };

/** Отменяет конкретный рейс (история сохраняется, статус CANCELLED) и уведомляет записавшихся. */
export async function cancelCarrierRide(carrierId: number, rideId: number): Promise<CancelRideResult> {
  const ride = await getCarrierRide(rideId);
  if (!ride || ride.carrierId !== carrierId) return { ok: false, reason: "not_found" };
  if (ride.status === "cancelled" || ride.status === "completed") {
    return { ok: false, reason: "already_done" };
  }

  await sql`UPDATE carrier_rides SET status = 'cancelled' WHERE id = ${rideId} AND carrier_id = ${carrierId}`;

  // История не удаляется — активные брони на отменённый рейс тоже помечаем
  // cancelled, чтобы occupied_seats/список пассажиров не вводили в заблуждение.
  await sql`UPDATE carrier_bookings SET status = 'cancelled' WHERE carrier_ride_id = ${rideId} AND status = 'active'`;

  const carrier = await getCarrierById(carrierId);
  const interested = await sql<{ userId: number }[]>`
    SELECT user_id as "userId" FROM carrier_ride_interests WHERE carrier_ride_id = ${rideId}
  `;

  for (const { userId } of interested) {
    sendPushToUser(userId, {
      title: "Рейс отменён",
      body: `${carrier?.name ?? "Перевозчик"}: ${ride.fromCity} → ${ride.toCity} в ${ride.departureTime} отменён.`,
      url: carrier ? `/carrier/${carrier.slug}` : "/",
    });
  }

  const updated = await getCarrierRide(rideId);
  return { ok: true, ride: updated! };
}

export type SetRideStatusResult = { ok: true } | { ok: false; reason: "not_found" | "invalid_transition" };

/**
 * Переключает рейс между "выехал" (departed) и "завершён" (completed) —
 * используем уже существующие значения status, новых состояний не вводим.
 */
export async function setRideDepartedOrCompleted(
  carrierId: number,
  rideId: number,
  status: "departed" | "completed"
): Promise<SetRideStatusResult> {
  const ride = await getCarrierRide(rideId);
  if (!ride || ride.carrierId !== carrierId) return { ok: false, reason: "not_found" };

  if (status === "departed" && !(ride.status === "open" || ride.status === "full")) {
    return { ok: false, reason: "invalid_transition" };
  }
  if (status === "completed" && ride.status !== "departed") {
    return { ok: false, reason: "invalid_transition" };
  }

  await sql`UPDATE carrier_rides SET status = ${status} WHERE id = ${rideId} AND carrier_id = ${carrierId}`;
  return { ok: true };
}

export type RideInterestedUser = { id: number; name: string; createdAt: string };

/** Пассажиры, оставившие заявку «Хочу поехать» на конкретный рейс через Едем30. */
export async function getRideInterestedUsers(rideId: number): Promise<RideInterestedUser[]> {
  return sql<RideInterestedUser[]>`
    SELECT u.id as id, u.name as name, i.created_at as "createdAt"
    FROM carrier_ride_interests i
    JOIN users u ON u.id = i.user_id
    WHERE i.carrier_ride_id = ${rideId}
    ORDER BY i.created_at ASC
  `;
}

export const ANALYTICS_MIN_SAMPLES = 3;

export type LoadStat = { label: string; avgLoadPct: number; sampleCount: number };

export type CarrierAnalytics = {
  today: {
    rides: number;
    passengers: number;
    avgLoadPct: number | null;
    requests: number;
    estimatedRevenue: number;
    bookingsBySource: { operator: number; edem30: number };
  };
  byRide: LoadStat[];
  byVehicle: LoadStat[];
  byWeekday: LoadStat[];
  minSamples: number;
  recommendations: { type: "hot" | "low"; label: string; loadPct: number }[];
};

const WEEKDAY_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

/** Реальная загрузка — по прошедшим/сегодняшним рейсам, будущие не учитываются (нет данных). */
export async function getCarrierAnalytics(carrierId: number): Promise<CarrierAnalytics> {
  const today = dateStrOffset(0);

  const [todayRides, byRideRows, byVehicleRows, byWeekdayRows, requestsToday, revenueToday, bookingsBySourceToday] = await Promise.all([
    sql<{ occupied_seats: number; total_seats: number }[]>`
      SELECT occupied_seats, total_seats FROM carrier_rides
      WHERE carrier_id = ${carrierId} AND ride_date = ${today} AND status != 'cancelled'
    `,
    sql<{ label: string; avg_load: number | null; sample_count: string }[]>`
      SELECT (from_city || ' → ' || to_city || ' ' || departure_time) as label,
             AVG(occupied_seats::float / NULLIF(total_seats, 0) * 100) as avg_load,
             COUNT(*) as sample_count
      FROM carrier_rides
      WHERE carrier_id = ${carrierId} AND ride_date <= ${today} AND status != 'cancelled'
      GROUP BY from_city, to_city, departure_time
      ORDER BY avg_load DESC NULLS LAST
    `,
    sql<{ label: string; avg_load: number | null; sample_count: string }[]>`
      SELECT v.label as label,
             AVG(r.occupied_seats::float / NULLIF(r.total_seats, 0) * 100) as avg_load,
             COUNT(*) as sample_count
      FROM carrier_rides r
      JOIN carrier_vehicles v ON v.id = r.vehicle_id
      WHERE r.carrier_id = ${carrierId} AND r.ride_date <= ${today} AND r.status != 'cancelled'
      GROUP BY v.id, v.label
      ORDER BY avg_load DESC NULLS LAST
    `,
    sql<{ dow: number; avg_load: number | null; sample_count: string }[]>`
      SELECT EXTRACT(ISODOW FROM ride_date::date)::int as dow,
             AVG(occupied_seats::float / NULLIF(total_seats, 0) * 100) as avg_load,
             COUNT(*) as sample_count
      FROM carrier_rides
      WHERE carrier_id = ${carrierId} AND ride_date <= ${today} AND status != 'cancelled'
      GROUP BY dow
      ORDER BY dow ASC
    `,
    sql<{ c: string }[]>`
      SELECT
        (SELECT COUNT(*) FROM carrier_ride_interests i JOIN carrier_rides r ON r.id = i.carrier_ride_id
          WHERE r.carrier_id = ${carrierId} AND i.created_at >= date_trunc('day', now()))
        +
        (SELECT COUNT(*) FROM carrier_ride_offers o JOIN carrier_rides r ON r.id = o.carrier_ride_id
          WHERE r.carrier_id = ${carrierId} AND o.created_at >= date_trunc('day', now()))
        as c
    `,
    // «Расчётная выручка» — сумма мест активных броней × цена рейса, только по
    // рейсам сегодняшней даты. Явно не факт оплаты — только оформленные места.
    sql<{ revenue: string | null }[]>`
      SELECT SUM(b.seats * r.price) as revenue
      FROM carrier_bookings b
      JOIN carrier_rides r ON r.id = b.carrier_ride_id
      WHERE r.carrier_id = ${carrierId} AND r.ride_date = ${today} AND b.status = 'active'
    `,
    sql<{ source: BookingSource; c: string }[]>`
      SELECT b.source as source, COUNT(*) as c
      FROM carrier_bookings b
      JOIN carrier_rides r ON r.id = b.carrier_ride_id
      WHERE r.carrier_id = ${carrierId} AND r.ride_date = ${today} AND b.status = 'active'
      GROUP BY b.source
    `,
  ]);

  const passengersToday = todayRides.reduce((sum, r) => sum + r.occupied_seats, 0);
  const avgLoadToday =
    todayRides.length > 0
      ? Math.round(
          todayRides.reduce((sum, r) => sum + (r.total_seats > 0 ? (r.occupied_seats / r.total_seats) * 100 : 0), 0) /
            todayRides.length
        )
      : null;

  const byRide: LoadStat[] = byRideRows.map((r) => ({
    label: r.label,
    avgLoadPct: r.avg_load !== null ? Math.round(r.avg_load) : 0,
    sampleCount: Number(r.sample_count),
  }));

  const byVehicle: LoadStat[] = byVehicleRows.map((r) => ({
    label: r.label,
    avgLoadPct: r.avg_load !== null ? Math.round(r.avg_load) : 0,
    sampleCount: Number(r.sample_count),
  }));

  const byWeekday: LoadStat[] = byWeekdayRows.map((r) => ({
    label: WEEKDAY_LABELS[r.dow - 1] ?? String(r.dow),
    avgLoadPct: r.avg_load !== null ? Math.round(r.avg_load) : 0,
    sampleCount: Number(r.sample_count),
  }));

  const recommendations: CarrierAnalytics["recommendations"] = [];
  for (const stat of byRide) {
    if (stat.sampleCount < ANALYTICS_MIN_SAMPLES) continue;
    if (stat.avgLoadPct >= 85) recommendations.push({ type: "hot", label: stat.label, loadPct: stat.avgLoadPct });
    else if (stat.avgLoadPct <= 40) recommendations.push({ type: "low", label: stat.label, loadPct: stat.avgLoadPct });
  }

  const bookingsBySource = { operator: 0, edem30: 0 };
  for (const row of bookingsBySourceToday) {
    bookingsBySource[row.source] = Number(row.c);
  }

  return {
    today: {
      rides: todayRides.length,
      passengers: passengersToday,
      avgLoadPct: avgLoadToday,
      requests: Number(requestsToday[0].c),
      estimatedRevenue: revenueToday[0]?.revenue ? Number(revenueToday[0].revenue) : 0,
      bookingsBySource,
    },
    byRide,
    byVehicle,
    byWeekday,
    minSamples: ANALYTICS_MIN_SAMPLES,
    recommendations,
  };
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

// ==================================================================
// Бронирования (carrier_bookings) — этап 2 CRM-модуля перевозчика.
//
// carrier_bookings — единственный источник данных о конкретных
// пассажирах. occupied_seats на carrier_rides меняется ТОЛЬКО вместе с
// созданием/отменой брони, в одной транзакции с ней — второго механизма
// подсчёта мест нет (никаких прямых вызовов adjustSeats для carrier-рейсов
// с этого момента, adjustSeats остаётся для случаев без бронирований).
// ==================================================================

export type BookingSource = "operator" | "edem30";

export type CarrierBooking = {
  id: number;
  carrierRideId: number;
  seats: number;
  passengerName: string;
  passengerPhone: string | null;
  pickup: string | null;
  dropoff: string | null;
  comment: string | null;
  source: BookingSource;
  userId: number | null;
  createdBy: number | null;
  status: "active" | "cancelled";
  createdAt: string;
};

const BOOKING_SELECT = sql`
  SELECT b.id as "id", b.carrier_ride_id as "carrierRideId", b.seats as "seats",
         b.passenger_name as "passengerName", b.passenger_phone as "passengerPhone",
         b.pickup as "pickup", b.dropoff as "dropoff", b.comment as "comment",
         b.source as "source", b.user_id as "userId", b.created_by as "createdBy",
         b.status as "status", b.created_at as "createdAt"
  FROM carrier_bookings b
`;

/** Активные и отменённые брони рейса — для менеджера/водителя (список пассажиров). */
export async function listBookingsForRide(rideId: number): Promise<CarrierBooking[]> {
  return sql<CarrierBooking[]>`
    ${BOOKING_SELECT}
    WHERE b.carrier_ride_id = ${rideId}
    ORDER BY b.created_at ASC
  `;
}

/** Сотрудник-водитель, назначенный на конкретную машину перевозчика (может отсутствовать). */
async function getAssignedDriver(
  carrierId: number,
  vehicleId: number,
  executor: postgres.ISql = sql
): Promise<{ userId: number; name: string } | null> {
  const rows = await executor<{ userId: number; name: string }[]>`
    SELECT cu.user_id as "userId", u.name as "name"
    FROM carrier_users cu
    JOIN users u ON u.id = cu.user_id
    WHERE cu.carrier_id = ${carrierId} AND cu.role = 'driver' AND cu.vehicle_id = ${vehicleId}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export type CreateBookingInput = {
  seats: number;
  passengerName: string;
  passengerPhone?: string;
  pickup?: string;
  dropoff?: string;
  comment?: string;
  source: BookingSource;
  userId?: number; // обязателен при source='edem30'
  createdBy?: number; // сотрудник-оператор/менеджер, оформивший бронь вручную
};

export type CreateBookingResult =
  | { ok: true; booking: CarrierBooking; tripId: number | null; tripCreated: boolean }
  | { ok: false; reason: "not_found" | "not_open" | "not_enough_seats" | "missing_user_id" };

const CARRIER_TRANSPORT_LABEL = "Микроавтобус";
const CARRIER_TRANSPORT_CATEGORY = "minibus";

/**
 * Атомарно создаёт бронь: одна транзакция резервирует места (тот же приём,
 * что и adjustSeats — UPDATE с проверкой границ в WHERE, поэтому на
 * последнее свободное место одновременно может претендовать сколько угодно
 * запросов, но забронировать его сможет только один — остальные получат
 * not_enough_seats) и создаёт запись в carrier_bookings в той же
 * транзакции. Если это первый подтверждённый пассажир Едем30 (source=
 * 'edem30' с userId) на рейсе с уже назначенным водителем — лениво
 * создаёт обычную поездку (trips) и добавляет пассажира в
 * trip_participants, переиспользуя существующий чат/страницу поездки.
 */
export async function createBooking(
  carrierId: number,
  rideId: number,
  input: CreateBookingInput
): Promise<CreateBookingResult> {
  if (input.source === "edem30" && !input.userId) {
    return { ok: false, reason: "missing_user_id" };
  }

  const result = await sql.begin(async (tx) => {
    // Атомарный захват мест — та же гарантия, что и adjustSeats/fulfillRideRequests:
    // Postgres сериализует конкурентные UPDATE по строке, поэтому эта строка
    // остаётся заблокированной для других транзакций до COMMIT/ROLLBACK ниже.
    const reserved = await tx<
      {
        vehicleId: number;
        fromCity: string;
        toCity: string;
        rideDate: string;
        departureTime: string;
        price: number;
        totalSeats: number;
        tripId: number | null;
      }[]
    >`
      UPDATE carrier_rides
      SET occupied_seats = occupied_seats + ${input.seats},
          status = CASE WHEN occupied_seats + ${input.seats} >= total_seats THEN 'full' ELSE status END
      WHERE id = ${rideId} AND carrier_id = ${carrierId}
        AND status IN ('open', 'full')
        AND occupied_seats + ${input.seats} <= total_seats
      RETURNING vehicle_id as "vehicleId", from_city as "fromCity", to_city as "toCity",
                ride_date as "rideDate", departure_time as "departureTime", price as "price",
                total_seats as "totalSeats", trip_id as "tripId"
    `;

    if (reserved.length === 0) {
      const exists = await tx<{ id: number }[]>`SELECT id FROM carrier_rides WHERE id = ${rideId} AND carrier_id = ${carrierId}`;
      return { ok: false as const, reason: exists.length === 0 ? ("not_found" as const) : ("not_enough_seats" as const) };
    }

    const ride = reserved[0];

    const [inserted] = await tx<{ id: number }[]>`
      INSERT INTO carrier_bookings
        (carrier_ride_id, seats, passenger_name, passenger_phone, pickup, dropoff, comment, source, user_id, created_by)
      VALUES (
        ${rideId}, ${input.seats}, ${input.passengerName}, ${input.passengerPhone ?? null},
        ${input.pickup ?? null}, ${input.dropoff ?? null}, ${input.comment ?? null},
        ${input.source}, ${input.userId ?? null}, ${input.createdBy ?? null}
      )
      RETURNING id
    `;

    let tripId = ride.tripId;
    let tripCreated = false;

    if (input.source === "edem30" && input.userId) {
      if (tripId === null) {
        const driver = await getAssignedDriver(carrierId, ride.vehicleId, tx);

        // Требование: если у рейса ещё нет назначенного водителя — trips НЕ создаём.
        // Бронь всё равно засчитывается (место занято), просто без чата/страницы
        // поездки до момента, пока перевозчик не назначит водителя.
        if (driver) {
          const vehicleRows = await tx<{ label: string; plate: string | null; showPlate: boolean }[]>`
            SELECT label, plate, show_plate as "showPlate" FROM carrier_vehicles WHERE id = ${ride.vehicleId}
          `;
          const vehicle = vehicleRows[0];

          const newTripId = await createTrip(
            {
              type: "intercity",
              from: ride.fromCity,
              to: ride.toCity,
              date: ride.rideDate,
              time: ride.departureTime,
              price: ride.price,
              totalSeats: ride.totalSeats,
              transport: CARRIER_TRANSPORT_LABEL,
              transportCategory: CARRIER_TRANSPORT_CATEGORY,
              carModel: vehicle?.label,
              licensePlate: vehicle?.showPlate ? vehicle.plate ?? undefined : undefined,
            },
            { id: driver.userId, name: driver.name },
            tx
          );

          // Строка carrier_rides уже заблокирована этой транзакцией (мы её
          // обновили выше) — второй одновременный запрос не может увидеть
          // NULL в trip_id, пока эта транзакция не завершится, поэтому
          // второй trips для того же рейса создать невозможно.
          await tx`UPDATE carrier_rides SET trip_id = ${newTripId} WHERE id = ${rideId}`;
          tripId = newTripId;
          tripCreated = true;

          // Если до назначения водителя на рейс уже успели подтвердиться
          // другие пассажиры Едем30 (их брони создавались без trips,
          // trip ещё не существовал) — подтягиваем их в участники сейчас,
          // а не только того, чья бронь стала триггером создания trip.
          await tx`
            INSERT INTO trip_participants (trip_id, user_id)
            SELECT ${newTripId}, backfill.user_id FROM (
              SELECT DISTINCT user_id FROM carrier_bookings
              WHERE carrier_ride_id = ${rideId} AND status = 'active' AND source = 'edem30' AND user_id IS NOT NULL
            ) backfill
            ON CONFLICT (trip_id, user_id) DO NOTHING
          `;
        }
      }

      if (tripId !== null) {
        await tx`
          INSERT INTO trip_participants (trip_id, user_id) VALUES (${tripId}, ${input.userId})
          ON CONFLICT (trip_id, user_id) DO NOTHING
        `;
      }
    }

    const [booking] = await tx<CarrierBooking[]>`
      ${BOOKING_SELECT}
      WHERE b.id = ${inserted.id}
    `;

    return { ok: true as const, booking, tripId, tripCreated };
  });

  if (!result.ok) return result;

  if (result.tripId !== null && result.booking.userId) {
    sendPushToUser(result.booking.userId, {
      title: result.tripCreated ? "Место забронировано" : "Вы добавлены в поездку",
      body: "Ваше место в рейсе подтверждено.",
      url: `/trip/${result.tripId}`,
    });
  }

  return result;
}

export type CancelBookingResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "already_cancelled" };

/**
 * Атомарно отменяет бронь: освобождает место в той же транзакции, что и
 * отмену записи, и — если это был пассажир Едем30 без других активных
 * броней на этот же рейс — убирает его из trip_participants (доступ к
 * чату/странице поездки прекращается). Сам trips не удаляется и не
 * трогается, если остаются другие участники — это уже гарантирует
 * существующий trip_participants.
 */
export async function cancelBooking(carrierId: number, bookingId: number): Promise<CancelBookingResult> {
  const result = await sql.begin(async (tx) => {
    const cancelled = await tx<
      { id: number; carrierRideId: number; seats: number; source: BookingSource; userId: number | null }[]
    >`
      UPDATE carrier_bookings b
      SET status = 'cancelled'
      FROM carrier_rides r
      WHERE b.id = ${bookingId} AND b.status = 'active'
        AND b.carrier_ride_id = r.id AND r.carrier_id = ${carrierId}
      RETURNING b.id as "id", b.carrier_ride_id as "carrierRideId", b.seats as "seats",
                b.source as "source", b.user_id as "userId"
    `;

    if (cancelled.length === 0) {
      const exists = await tx<{ id: number }[]>`
        SELECT b.id FROM carrier_bookings b
        JOIN carrier_rides r ON r.id = b.carrier_ride_id
        WHERE b.id = ${bookingId} AND r.carrier_id = ${carrierId}
      `;
      return { ok: false as const, reason: exists.length === 0 ? ("not_found" as const) : ("already_cancelled" as const) };
    }

    const booking = cancelled[0];

    const [ride] = await tx<{ tripId: number | null }[]>`
      UPDATE carrier_rides
      SET occupied_seats = GREATEST(occupied_seats - ${booking.seats}, 0),
          status = CASE
            WHEN status = 'full' AND occupied_seats - ${booking.seats} < total_seats THEN 'open'
            ELSE status
          END
      WHERE id = ${booking.carrierRideId}
      RETURNING trip_id as "tripId"
    `;

    if (booking.source === "edem30" && booking.userId && ride.tripId !== null) {
      const otherActive = await tx<{ id: number }[]>`
        SELECT id FROM carrier_bookings
        WHERE carrier_ride_id = ${booking.carrierRideId} AND user_id = ${booking.userId} AND status = 'active'
      `;

      if (otherActive.length === 0) {
        await tx`
          DELETE FROM trip_participants WHERE trip_id = ${ride.tripId} AND user_id = ${booking.userId}
        `;
      }
    }

    return { ok: true as const, userId: booking.userId, tripId: ride.tripId };
  });

  if (!result.ok) return result;

  if (result.userId) {
    sendPushToUser(result.userId, {
      title: "Бронь отменена",
      body: "Ваше место в рейсе освобождено.",
      url: result.tripId ? `/trip/${result.tripId}` : "/",
    });
  }

  return { ok: true };
}

// ==================================================================
// Сотрудники перевозчика (менеджер/оператор/водитель) — существующая
// carrier_users, отдельной системы пользователей не заводим.
// ==================================================================

export type CarrierEmployee = {
  id: number;
  userId: number;
  name: string;
  phone: string | null;
  role: CarrierEmployeeRole;
  vehicleId: number | null;
  vehicleLabel: string | null;
  lastSeenAt: string | null;
};

export async function listEmployees(carrierId: number): Promise<CarrierEmployee[]> {
  return sql<CarrierEmployee[]>`
    SELECT cu.id as "id", u.id as "userId", u.name as "name", u.phone as "phone",
           cu.role as "role", cu.vehicle_id as "vehicleId", v.label as "vehicleLabel",
           u.last_seen_at as "lastSeenAt"
    FROM carrier_users cu
    JOIN users u ON u.id = cu.user_id
    LEFT JOIN carrier_vehicles v ON v.id = cu.vehicle_id
    WHERE cu.carrier_id = ${carrierId}
    ORDER BY (cu.role = 'manager') DESC, (cu.role = 'operator') DESC, u.name ASC
  `;
}

export type AssignEmployeeResult =
  | { ok: true }
  | { ok: false; reason: "user_not_found" | "already_linked_elsewhere" | "invalid_vehicle" };

/** Назначает сотруднику роль (и, для водителя, машину) — переиспользует carrier_users, users.role не трогает. */
export async function assignEmployee(
  carrierId: number,
  userId: number,
  role: CarrierEmployeeRole,
  vehicleId: number | null
): Promise<AssignEmployeeResult> {
  const [target] = await sql<{ id: number }[]>`SELECT id FROM users WHERE id = ${userId}`;
  if (!target) return { ok: false, reason: "user_not_found" };

  if (role === "driver" && vehicleId !== null) {
    const [vehicle] = await sql<{ id: number }[]>`
      SELECT id FROM carrier_vehicles WHERE id = ${vehicleId} AND carrier_id = ${carrierId}
    `;
    if (!vehicle) return { ok: false, reason: "invalid_vehicle" };
  }

  const effectiveVehicleId = role === "driver" ? vehicleId : null;

  const [existing] = await sql<{ carrierId: number }[]>`
    SELECT carrier_id as "carrierId" FROM carrier_users WHERE user_id = ${userId}
  `;
  if (existing && existing.carrierId !== carrierId) {
    return { ok: false, reason: "already_linked_elsewhere" };
  }

  await sql`
    INSERT INTO carrier_users (carrier_id, user_id, role, vehicle_id)
    VALUES (${carrierId}, ${userId}, ${role}, ${effectiveVehicleId})
    ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role, vehicle_id = EXCLUDED.vehicle_id
  `;

  return { ok: true };
}

export async function removeEmployee(carrierId: number, employeeCarrierUserId: number): Promise<boolean> {
  const result = await sql`
    DELETE FROM carrier_users WHERE id = ${employeeCarrierUserId} AND carrier_id = ${carrierId}
  `;
  return result.count > 0;
}

// ==================================================================
// Поиск рейса для оператора — по маршруту/дате, со свободными местами.
// ==================================================================

export type RideSearchResult = CarrierRide & { freeSeats: number };

export async function searchRidesForBooking(
  carrierId: number,
  opts: { from?: string; to?: string; date: string }
): Promise<RideSearchResult[]> {
  await ensureRidesForDateRange(carrierId, 21);

  const rides = await sql<CarrierRide[]>`
    ${RIDE_SELECT}
    WHERE r.carrier_id = ${carrierId}
      AND r.ride_date = ${opts.date}
      AND r.status IN ('open', 'full')
      ${opts.from ? sql`AND r.from_city ILIKE ${`%${opts.from}%`}` : sql``}
      ${opts.to ? sql`AND r.to_city ILIKE ${`%${opts.to}%`}` : sql``}
    ORDER BY r.departure_time ASC
  `;

  return rides.map((r) => ({ ...r, freeSeats: freeSeats(r) }));
}
