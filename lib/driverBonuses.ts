import "server-only";

import { sql } from "@/lib/db";

const BONUS_AMOUNT = 50;

/**
 * Поездка достойна бонуса, если: у неё есть настоящий водитель (не
 * формирующаяся заявка), она не отменена, водитель подтвердил завершение,
 * и это НЕ поездка перевозчика (carrier_rides) — у перевозчика деньги
 * платит сам бизнес, а не эта акция Едем30.
 */
const ELIGIBLE_TRIP_CLAUSE = sql`
  trips.owner_id IS NOT NULL
  AND trips.cancelled_at IS NULL
  AND trips.driver_completed_at IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM carrier_rides WHERE carrier_rides.trip_id = trips.id)
`;

/**
 * Ленивая материализация: как и autoCancelEmptyIntercityTrips/
 * ensureRidesForDateRange, создаёт недостающие строки бонусов при каждом
 * обращении к разделу — по одной на каждого пассажира, который САМ
 * подтвердил завершение конкретной поездки (trip_participants.
 * complete_confirmed_at). UNIQUE(trip_id, passenger_id) гарантирует, что
 * повторный вызов не заведёт бонус дважды за одного и того же пассажира.
 */
export async function syncDriverBonuses(): Promise<void> {
  await sql`
    INSERT INTO driver_bonuses (trip_id, driver_id, passenger_id, amount)
    SELECT trips.id, trips.owner_id, trip_participants.user_id, ${BONUS_AMOUNT}
    FROM trip_participants
    JOIN trips ON trips.id = trip_participants.trip_id
    WHERE trip_participants.complete_confirmed_at IS NOT NULL
      AND ${ELIGIBLE_TRIP_CLAUSE}
    ON CONFLICT (trip_id, passenger_id) DO NOTHING
  `;
}

export type BonusStatus = "pending" | "approved" | "paid" | "rejected";

export const BONUS_STATUS_LABELS: Record<BonusStatus, string> = {
  pending: "Ожидает",
  approved: "Одобрено",
  paid: "Выплачено",
  rejected: "Отклонено",
};

export type BonusFilters = {
  dateFrom?: string;
  dateTo?: string;
  driverSearch?: string;
  status?: BonusStatus;
  from?: string;
  to?: string;
};

export type BonusTripSummary = {
  tripId: number;
  tripDate: string;
  tripTime: string;
  fromCity: string;
  toCity: string;
  price: number;
  totalSeats: number;
  driverId: number;
  driverName: string;
  driverPhone: string | null;
  passengersTotal: number;
  passengersCompleted: number;
  bonusCount: number;
  bonusTotal: number;
  status: BonusStatus | "mixed";
};

type BonusTripRow = {
  tripId: number;
  tripDate: string;
  tripTime: string;
  fromCity: string;
  toCity: string;
  price: number;
  totalSeats: number;
  driverId: number;
  driverName: string;
  driverPhone: string | null;
  passengersTotal: string;
  passengersCompleted: string;
  bonusCount: string;
  bonusTotal: string;
  statuses: BonusStatus[];
};

function aggregateStatus(statuses: BonusStatus[]): BonusStatus | "mixed" {
  const unique = [...new Set(statuses)];
  return unique.length === 1 ? unique[0] : "mixed";
}

/** Список поездок, сгруппированных по поездке — для основной таблицы раздела. */
export async function listBonusTrips(filters: BonusFilters): Promise<BonusTripSummary[]> {
  await syncDriverBonuses();

  const driverSearch = filters.driverSearch?.trim();
  const fromSearch = filters.from?.trim();
  const toSearch = filters.to?.trim();

  // Бонусы агрегируются ДО join'а с trip_participants — иначе join с
  // несколькими пассажирами размножил бы строки driver_bonuses (декартово
  // произведение) и посчитал бы сумму/количество бонусов по нескольку раз.
  const rows = await sql<BonusTripRow[]>`
    SELECT
      trips.id as "tripId",
      trips.trip_date as "tripDate",
      trips.trip_time as "tripTime",
      trips.from_city as "fromCity",
      trips.to_city as "toCity",
      trips.price as "price",
      trips.total_seats as "totalSeats",
      trips.owner_id as "driverId",
      driver.name as "driverName",
      driver.phone as "driverPhone",
      COUNT(DISTINCT tp.user_id) as "passengersTotal",
      COUNT(DISTINCT tp.user_id) FILTER (WHERE tp.complete_confirmed_at IS NOT NULL) as "passengersCompleted",
      bonus_agg.bonus_count as "bonusCount",
      bonus_agg.bonus_total as "bonusTotal",
      bonus_agg.statuses as "statuses"
    FROM trips
    JOIN users driver ON driver.id = trips.owner_id
    JOIN (
      SELECT trip_id, COUNT(*) as bonus_count, SUM(amount) as bonus_total, ARRAY_AGG(DISTINCT status) as statuses
      FROM driver_bonuses
      GROUP BY trip_id
    ) bonus_agg ON bonus_agg.trip_id = trips.id
    LEFT JOIN trip_participants tp ON tp.trip_id = trips.id
    WHERE 1=1
      ${filters.dateFrom ? sql`AND trips.trip_date >= ${filters.dateFrom}` : sql``}
      ${filters.dateTo ? sql`AND trips.trip_date <= ${filters.dateTo}` : sql``}
      ${driverSearch ? sql`AND (driver.name ILIKE ${`%${driverSearch}%`} OR driver.phone ILIKE ${`%${driverSearch}%`})` : sql``}
      ${fromSearch ? sql`AND trips.from_city ILIKE ${`%${fromSearch}%`}` : sql``}
      ${toSearch ? sql`AND trips.to_city ILIKE ${`%${toSearch}%`}` : sql``}
      ${filters.status ? sql`AND ${filters.status} = ANY(bonus_agg.statuses)` : sql``}
    GROUP BY trips.id, driver.name, driver.phone, bonus_agg.bonus_count, bonus_agg.bonus_total, bonus_agg.statuses
    ORDER BY trips.trip_date DESC, trips.trip_time DESC
  `;

  return rows.map((row) => ({
    tripId: row.tripId,
    tripDate: row.tripDate,
    tripTime: row.tripTime,
    fromCity: row.fromCity,
    toCity: row.toCity,
    price: row.price,
    totalSeats: row.totalSeats,
    driverId: row.driverId,
    driverName: row.driverName,
    driverPhone: row.driverPhone,
    passengersTotal: Number(row.passengersTotal),
    passengersCompleted: Number(row.passengersCompleted),
    bonusCount: Number(row.bonusCount),
    bonusTotal: Number(row.bonusTotal),
    status: aggregateStatus(row.statuses),
  }));
}

export type BonusPassengerDetail = {
  userId: number;
  name: string;
  phone: string | null;
  joinedAt: string;
  startConfirmed: boolean;
  completeConfirmed: boolean;
  bonusId: number | null;
  amount: number | null;
  status: BonusStatus | null;
  approvedAt: string | null;
  paidAt: string | null;
  rejectedAt: string | null;
};

export type BonusTripDetail = {
  tripId: number;
  tripDate: string;
  tripTime: string;
  fromCity: string;
  toCity: string;
  price: number;
  totalSeats: number;
  driverId: number;
  driverName: string;
  driverPhone: string | null;
  completed: boolean;
  cancelled: boolean;
  passengers: BonusPassengerDetail[];
};

/** Полная карточка поездки для модалки/страницы — включает ВСЕХ пассажиров, не только тех, кто получил бонус. */
export async function getBonusTripDetail(tripId: number): Promise<BonusTripDetail | null> {
  const [trip] = await sql<
    {
      tripId: number;
      tripDate: string;
      tripTime: string;
      fromCity: string;
      toCity: string;
      price: number;
      totalSeats: number;
      driverId: number;
      driverName: string;
      driverPhone: string | null;
      completed: boolean;
      cancelled: boolean;
    }[]
  >`
    SELECT
      trips.id as "tripId",
      trips.trip_date as "tripDate",
      trips.trip_time as "tripTime",
      trips.from_city as "fromCity",
      trips.to_city as "toCity",
      trips.price as "price",
      trips.total_seats as "totalSeats",
      trips.owner_id as "driverId",
      driver.name as "driverName",
      driver.phone as "driverPhone",
      (trips.driver_completed_at IS NOT NULL AND trips.passenger_completed_at IS NOT NULL) as "completed",
      (trips.cancelled_at IS NOT NULL) as "cancelled"
    FROM trips
    JOIN users driver ON driver.id = trips.owner_id
    WHERE trips.id = ${tripId}
  `;

  if (!trip) return null;

  const passengers = await sql<BonusPassengerDetail[]>`
    SELECT
      u.id as "userId",
      u.name as "name",
      u.phone as "phone",
      tp.joined_at as "joinedAt",
      (tp.start_confirmed_at IS NOT NULL) as "startConfirmed",
      (tp.complete_confirmed_at IS NOT NULL) as "completeConfirmed",
      db.id as "bonusId",
      db.amount as "amount",
      db.status as "status",
      db.approved_at as "approvedAt",
      db.paid_at as "paidAt",
      db.rejected_at as "rejectedAt"
    FROM trip_participants tp
    JOIN users u ON u.id = tp.user_id
    LEFT JOIN driver_bonuses db ON db.trip_id = tp.trip_id AND db.passenger_id = tp.user_id
    WHERE tp.trip_id = ${tripId}
    ORDER BY tp.joined_at ASC
  `;

  return { ...trip, passengers };
}

export type BonusActionResult = { ok: true; updated: number } | { ok: false; error: string };

function transitionFragment(status: Exclude<BonusStatus, "pending">, adminId: number) {
  if (status === "approved") return sql`approved_at = now(), approved_by = ${adminId}`;
  if (status === "paid") return sql`paid_at = now(), paid_by = ${adminId}`;
  return sql`rejected_at = now(), rejected_by = ${adminId}`;
}

/** Меняет статус ОДНОГО бонуса (индивидуальная поправка внутри карточки поездки). Уже выплаченный бонус трогать нельзя. */
export async function setBonusStatus(
  bonusId: number,
  status: Exclude<BonusStatus, "pending">,
  adminId: number
): Promise<BonusActionResult> {
  const result = await sql`
    UPDATE driver_bonuses
    SET status = ${status}, ${transitionFragment(status, adminId)}
    WHERE id = ${bonusId} AND status != 'paid'
    RETURNING id
  `;

  if (result.count > 0) return { ok: true, updated: result.count };

  const [existing] = await sql<{ status: BonusStatus }[]>`SELECT status FROM driver_bonuses WHERE id = ${bonusId}`;
  if (!existing) return { ok: false, error: "Бонус не найден" };
  return { ok: false, error: "Бонус уже выплачен — статус нельзя изменить" };
}

/** Массовое изменение статуса всех бонусов поездки одним действием (уже выплаченные пропускаются, не трогаются). */
export async function setTripBonusesStatus(
  tripId: number,
  status: Exclude<BonusStatus, "pending">,
  adminId: number
): Promise<BonusActionResult> {
  const result = await sql`
    UPDATE driver_bonuses
    SET status = ${status}, ${transitionFragment(status, adminId)}
    WHERE trip_id = ${tripId} AND status != 'paid'
    RETURNING id
  `;

  return { ok: true, updated: result.count };
}

export type BonusStats = {
  successfulTrips: number;
  passengers: number;
  accruedCount: number;
  paidCount: number;
  pendingCount: number;
  totalPayoutSum: number;
};

export async function getBonusStats(): Promise<BonusStats> {
  await syncDriverBonuses();

  const [row] = await sql<
    {
      successfulTrips: string;
      passengers: string;
      accruedCount: string;
      paidCount: string;
      pendingCount: string;
      totalPayoutSum: string;
    }[]
  >`
    SELECT
      COUNT(DISTINCT trip_id) as "successfulTrips",
      COUNT(DISTINCT passenger_id) as "passengers",
      COUNT(*) as "accruedCount",
      COUNT(*) FILTER (WHERE status = 'paid') as "paidCount",
      COUNT(*) FILTER (WHERE status = 'pending') as "pendingCount",
      COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0) as "totalPayoutSum"
    FROM driver_bonuses
  `;

  return {
    successfulTrips: Number(row.successfulTrips),
    passengers: Number(row.passengers),
    accruedCount: Number(row.accruedCount),
    paidCount: Number(row.paidCount),
    pendingCount: Number(row.pendingCount),
    totalPayoutSum: Number(row.totalPayoutSum),
  };
}

export type DriverBonusSummary = {
  totalEarned: number; // заработано за вычетом отклонённых (pending + approved + paid)
  paid: number; // уже выплачено
  pending: number; // ещё не выплачено (pending + approved)
  passengersCount: number; // сколько разных пассажиров принесли бонус
};

/** Сводка для карточки "Ваш бонус" в профиле самого водителя — не для админки. */
export async function getDriverBonusSummary(driverId: number): Promise<DriverBonusSummary> {
  await syncDriverBonuses();

  const [row] = await sql<
    { totalEarned: string; paid: string; pending: string; passengersCount: string }[]
  >`
    SELECT
      COALESCE(SUM(amount) FILTER (WHERE status != 'rejected'), 0) as "totalEarned",
      COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0) as "paid",
      COALESCE(SUM(amount) FILTER (WHERE status IN ('pending', 'approved')), 0) as "pending",
      COUNT(DISTINCT passenger_id) FILTER (WHERE status != 'rejected') as "passengersCount"
    FROM driver_bonuses
    WHERE driver_id = ${driverId}
  `;

  return {
    totalEarned: Number(row.totalEarned),
    paid: Number(row.paid),
    pending: Number(row.pending),
    passengersCount: Number(row.passengersCount),
  };
}
