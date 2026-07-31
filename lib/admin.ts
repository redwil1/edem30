import "server-only";

import crypto from "crypto";

import { sql } from "@/lib/db";
import { getCurrentUser, hashPassword, UserRole } from "@/lib/auth";
import { ACTIVE_TRIP_CLAUSE } from "@/lib/liveStats";
import { isPlaceholderName } from "@/lib/nameValidation";

export async function requireAdmin() {
  const user = await getCurrentUser();

  if (!user || user.role !== "admin") return null;

  return user;
}

/** Админ или модератор — для разделов модерации (жалобы, отзывы, чаты, верификации). */
export async function requireStaff() {
  const user = await getCurrentUser();

  if (!user || (user.role !== "admin" && user.role !== "moderator")) return null;

  return user;
}

export type TripTypeCounts = {
  intercity: number;
  city: number;
};

export type AdminStats = {
  usersCount: number;
  driversCount: number;
  passengersCount: number;
  onlineCount: number;
  activeTripsCount: number;
  openTaxiOrdersCount: number;
  registeredTodayCount: number;
  tripsCount: number;
  tripsByType: TripTypeCounts;
  reviewsCount: number;
  reviewsByType: TripTypeCounts;
  newReportsCount: number;
};

export async function getAdminStats(): Promise<AdminStats> {
  const [userAgg, tripAgg, reviewsByTypeRows, openTaxiOrders, reports] = await Promise.all([
    sql<
      { total: string; drivers: string; passengers: string; online: string; registered_today: string }[]
    >`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE role = 'driver') as drivers,
        COUNT(*) FILTER (WHERE role = 'passenger') as passengers,
        COUNT(*) FILTER (
          WHERE last_seen_at IS NOT NULL
            AND last_seen_at::timestamptz > now() - interval '5 minutes'
        ) as online,
        COUNT(*) FILTER (WHERE created_at::timestamptz > date_trunc('day', now())) as registered_today
      FROM users
    `,
    sql<
      { total: string; intercity: string; city: string; active: string }[]
    >`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE type = 'intercity') as intercity,
        COUNT(*) FILTER (WHERE type = 'city') as city,
        COUNT(*) FILTER (WHERE ${ACTIVE_TRIP_CLAUSE}) as active
      FROM trips
    `,
    sql<{ type: string; c: string }[]>`
      SELECT trips.type as type, COUNT(*) as c
      FROM reviews
      JOIN trips ON trips.id = reviews.trip_id
      GROUP BY trips.type
    `,
    sql<{ c: string }[]>`SELECT COUNT(*) as c FROM taxi_orders WHERE status = 'open'`,
    sql<{ c: string }[]>`SELECT COUNT(*) as c FROM trip_reports WHERE status = 'new'`,
  ]);

  function toTypeCounts(rows: { type: string; c: string }[]): TripTypeCounts {
    const counts: TripTypeCounts = { intercity: 0, city: 0 };

    for (const row of rows) {
      if (row.type === "intercity" || row.type === "city") {
        counts[row.type] = Number(row.c);
      }
    }

    return counts;
  }

  const u = userAgg[0];
  const t = tripAgg[0];
  const reviewsByType = toTypeCounts(reviewsByTypeRows);

  return {
    usersCount: Number(u.total),
    driversCount: Number(u.drivers),
    passengersCount: Number(u.passengers),
    onlineCount: Number(u.online),
    activeTripsCount: Number(t.active),
    openTaxiOrdersCount: Number(openTaxiOrders[0].c),
    registeredTodayCount: Number(u.registered_today),
    tripsCount: Number(t.total),
    tripsByType: { intercity: Number(t.intercity), city: Number(t.city) },
    reviewsCount: reviewsByType.intercity + reviewsByType.city,
    reviewsByType,
    newReportsCount: Number(reports[0].c),
  };
}

export type VisitPeriodStats = {
  registered: number;
  guest: number;
};

export type VisitStats = {
  day: VisitPeriodStats;
  week: VisitPeriodStats;
  month: VisitPeriodStats;
};

async function visitCountsSince(interval: string): Promise<VisitPeriodStats> {
  const rows = await sql<{ registered: string; guest: string }[]>`
    SELECT
      COUNT(*) FILTER (WHERE user_id IS NOT NULL) as registered,
      COUNT(*) FILTER (WHERE user_id IS NULL) as guest
    FROM site_visits
    WHERE created_at::timestamptz >= now() - ${interval}::interval
  `;

  return {
    registered: Number(rows[0]?.registered ?? 0),
    guest: Number(rows[0]?.guest ?? 0),
  };
}

export async function getVisitStats(): Promise<VisitStats> {
  const [day, week, month] = await Promise.all([
    visitCountsSince("1 day"),
    visitCountsSince("7 days"),
    visitCountsSince("30 days"),
  ]);

  return { day, week, month };
}

export type AdminAccountInfo = {
  id: number;
  name: string;
  lastLoginIp: string | null;
  lastLoginAt: string | null;
};

export async function getAdminAccounts(): Promise<AdminAccountInfo[]> {
  const rows = await sql<
    { id: number; name: string; last_login_ip: string | null; last_login_at: string | null }[]
  >`
    SELECT id, name, last_login_ip, last_login_at
    FROM users
    WHERE role = 'admin'
    ORDER BY id ASC
  `;

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    lastLoginIp: r.last_login_ip,
    lastLoginAt: r.last_login_at,
  }));
}

export type AdminUserFilter =
  | "all"
  | "driver"
  | "passenger"
  | "blocked"
  | "noname"
  | "push"
  | "no_push"
  | "vip";

export type AdminUser = {
  id: number;
  name: string;
  phone: string | null;
  role: UserRole;
  createdAt: string;
  reportsAgainst: number;
  isBlocked: boolean;
  pushDeviceCount: number;
  isVip: boolean;
  carrierId: number | null;
};

type AdminUserRow = {
  id: number;
  name: string;
  phone: string | null;
  role: UserRole;
  createdat: string;
  reports_against: string;
  is_blocked: boolean;
  push_device_count: string;
  is_vip: boolean;
  carrier_id: number | null;
};

export async function listAdminUsers(
  search?: string,
  filter: AdminUserFilter = "all"
): Promise<AdminUser[]> {
  const rows = await sql<AdminUserRow[]>`
    SELECT users.id as id, users.name as name, users.phone as phone,
           users.role as role, users.created_at as createdAt,
           users.is_blocked as is_blocked, users.is_vip as is_vip,
           (SELECT COUNT(*) FROM trip_reports WHERE trip_reports.reported_user_id = users.id) as reports_against,
           (SELECT COUNT(*) FROM push_subscriptions WHERE push_subscriptions.user_id = users.id) as push_device_count,
           (SELECT carrier_id FROM carrier_users WHERE carrier_users.user_id = users.id) as carrier_id
    FROM users
    WHERE 1 = 1
      ${search ? sql`AND name ILIKE ${`%${search}%`}` : sql``}
      ${filter === "driver" ? sql`AND role = 'driver'` : sql``}
      ${filter === "passenger" ? sql`AND role = 'passenger'` : sql``}
      ${filter === "blocked" ? sql`AND is_blocked = true` : sql``}
      ${filter === "push" ? sql`AND EXISTS (SELECT 1 FROM push_subscriptions WHERE push_subscriptions.user_id = users.id)` : sql``}
      ${filter === "no_push" ? sql`AND NOT EXISTS (SELECT 1 FROM push_subscriptions WHERE push_subscriptions.user_id = users.id)` : sql``}
      ${filter === "vip" ? sql`AND users.is_vip = true` : sql``}
    ORDER BY id DESC
  `;

  const users = rows.map((r) => ({
    id: r.id,
    name: r.name,
    phone: r.phone,
    role: r.role,
    createdAt: r.createdat,
    reportsAgainst: Number(r.reports_against),
    isBlocked: r.is_blocked,
    pushDeviceCount: Number(r.push_device_count),
    isVip: r.is_vip,
    carrierId: r.carrier_id,
  }));

  if (filter === "noname") {
    return users.filter((u) => isPlaceholderName(u.name));
  }

  return users;
}

export async function setUserVip(userId: number, vip: boolean): Promise<boolean> {
  const result = await sql`UPDATE users SET is_vip = ${vip} WHERE id = ${userId}`;
  return result.count > 0;
}

/** Привязка/отвязка пользователя к перевозчику (доступ к его кабинету /carrier/dashboard). */
export async function setUserCarrier(userId: number, carrierId: number | null): Promise<boolean> {
  if (carrierId === null) {
    await sql`DELETE FROM carrier_users WHERE user_id = ${userId}`;
    return true;
  }

  await sql`
    INSERT INTO carrier_users (carrier_id, user_id) VALUES (${carrierId}, ${userId})
    ON CONFLICT (user_id) DO UPDATE SET carrier_id = EXCLUDED.carrier_id
  `;
  return true;
}

/** Полностью включает/выключает перевозчика (публичная страница и кабинет перестают быть доступны). */
export async function setCarrierActive(carrierId: number, active: boolean): Promise<boolean> {
  const result = await sql`UPDATE carriers SET active = ${active} WHERE id = ${carrierId}`;
  return result.count > 0;
}

export type CarrierAdminOverview = {
  carriersCount: number;
  vipCount: number;
  activeRidesToday: number;
  totalViews: number;
  totalRequests: number;
  carriers: {
    id: number;
    slug: string;
    name: string;
    active: boolean;
    vehiclesCount: number;
    ridesToday: number;
    viewsTotal: number;
    requestsTotal: number;
    operator: { id: number; name: string } | null;
    employeeCounts: { manager: number; operator: number; driver: number };
  }[];
};

export async function getCarrierAdminOverview(): Promise<CarrierAdminOverview> {
  const carriers = await sql<
    { id: number; slug: string; name: string; active: boolean }[]
  >`SELECT id, slug, name, active FROM carriers ORDER BY id ASC`;

  const [vipCount] = await sql<{ c: string }[]>`SELECT COUNT(*) as c FROM users WHERE is_vip = true`;

  const details = await Promise.all(
    carriers.map(async (c) => {
      const [vehicles, ridesToday, views, interests, offers, operator, employeesByRole] = await Promise.all([
        sql<{ c: string }[]>`SELECT COUNT(*) as c FROM carrier_vehicles WHERE carrier_id = ${c.id} AND active = true`,
        sql<{ c: string }[]>`
          SELECT COUNT(*) as c FROM carrier_rides
          WHERE carrier_id = ${c.id} AND ride_date = to_char(now(), 'YYYY-MM-DD')
            AND status NOT IN ('cancelled')
        `,
        sql<{ c: string }[]>`SELECT COUNT(*) as c FROM carrier_page_views WHERE carrier_id = ${c.id}`,
        sql<{ c: string }[]>`
          SELECT COUNT(*) as c FROM carrier_ride_interests i
          JOIN carrier_rides r ON r.id = i.carrier_ride_id WHERE r.carrier_id = ${c.id}
        `,
        sql<{ c: string }[]>`
          SELECT COUNT(*) as c FROM carrier_ride_offers o
          JOIN carrier_rides r ON r.id = o.carrier_ride_id WHERE r.carrier_id = ${c.id}
        `,
        sql<{ id: number; name: string }[]>`
          SELECT users.id as id, users.name as name FROM carrier_users
          JOIN users ON users.id = carrier_users.user_id
          WHERE carrier_users.carrier_id = ${c.id} AND carrier_users.role = 'manager' LIMIT 1
        `,
        sql<{ role: "manager" | "operator" | "driver"; c: string }[]>`
          SELECT role, COUNT(*) as c FROM carrier_users WHERE carrier_id = ${c.id} GROUP BY role
        `,
      ]);

      const employeeCounts = { manager: 0, operator: 0, driver: 0 };
      for (const row of employeesByRole) employeeCounts[row.role] = Number(row.c);

      return {
        id: c.id,
        slug: c.slug,
        name: c.name,
        active: c.active,
        vehiclesCount: Number(vehicles[0].c),
        ridesToday: Number(ridesToday[0].c),
        viewsTotal: Number(views[0].c),
        requestsTotal: Number(interests[0].c) + Number(offers[0].c),
        operator: operator[0] ?? null,
        employeeCounts,
      };
    })
  );

  return {
    carriersCount: carriers.length,
    vipCount: Number(vipCount.c),
    activeRidesToday: details.reduce((sum, c) => sum + c.ridesToday, 0),
    totalViews: details.reduce((sum, c) => sum + c.viewsTotal, 0),
    totalRequests: details.reduce((sum, c) => sum + c.requestsTotal, 0),
    carriers: details,
  };
}

export type PushStats = {
  totalUsers: number;
  usersWithPush: number;
  usersWithoutPush: number;
  activeSubscriptions: number;
  percentage: number;
};

/**
 * Один пользователь может иметь несколько push-подписок (несколько
 * устройств) — считаем пользователей через COUNT(DISTINCT user_id),
 * а подписки отдельно через обычный COUNT(*).
 */
export async function getPushStats(): Promise<PushStats> {
  const [row] = await sql<
    { total_users: string; users_with_push: string; active_subscriptions: string }[]
  >`
    SELECT
      (SELECT COUNT(*) FROM users) as total_users,
      (SELECT COUNT(DISTINCT user_id) FROM push_subscriptions) as users_with_push,
      (SELECT COUNT(*) FROM push_subscriptions) as active_subscriptions
  `;

  const totalUsers = Number(row.total_users);
  const usersWithPush = Number(row.users_with_push);

  return {
    totalUsers,
    usersWithPush,
    usersWithoutPush: totalUsers - usersWithPush,
    activeSubscriptions: Number(row.active_subscriptions),
    percentage: totalUsers > 0 ? Math.round((usersWithPush / totalUsers) * 100) : 0,
  };
}

export type RecentSignup = {
  id: number;
  name: string;
  phone: string | null;
  role: UserRole;
  createdAt: string;
};

export async function getRecentSignups(limit = 10): Promise<RecentSignup[]> {
  const rows = await sql<
    { id: number; name: string; phone: string | null; role: UserRole; created_at: string }[]
  >`
    SELECT id, name, phone, role, created_at
    FROM users
    ORDER BY created_at DESC, id DESC
    LIMIT ${limit}
  `;

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    phone: r.phone,
    role: r.role,
    createdAt: r.created_at,
  }));
}

const ASSIGNABLE_ROLES: UserRole[] = ["passenger", "driver", "admin", "moderator"];

export async function setAdminUserRole(
  userId: number,
  role: string
): Promise<boolean> {
  if (!ASSIGNABLE_ROLES.includes(role as UserRole)) return false;

  const result = await sql`UPDATE users SET role = ${role} WHERE id = ${userId}`;

  return result.count > 0;
}

export async function setUserBlocked(
  userId: number,
  blocked: boolean
): Promise<boolean> {
  const result = await sql`UPDATE users SET is_blocked = ${blocked} WHERE id = ${userId}`;

  return result.count > 0;
}

export type AdminTripStatus =
  | "cancelled"
  | "completed"
  | "in_progress"
  | "scheduled";

export type AdminTrip = {
  id: number;
  from: string;
  to: string;
  date: string;
  time: string;
  price: number;
  status: AdminTripStatus;
  driverName: string;
};

type AdminTripRow = {
  id: number;
  from_city: string;
  to_city: string;
  trip_date: string;
  trip_time: string;
  price: number;
  driver_name: string;
  cancelled_at: string | null;
  driver_confirmed_at: string | null;
  passenger_confirmed_at: string | null;
  driver_completed_at: string | null;
  passenger_completed_at: string | null;
};

function tripStatus(row: AdminTripRow): AdminTripStatus {
  if (row.cancelled_at) return "cancelled";
  if (row.driver_completed_at && row.passenger_completed_at) return "completed";
  if (row.driver_confirmed_at && row.passenger_confirmed_at) return "in_progress";
  return "scheduled";
}

function toAdminTrip(row: AdminTripRow): AdminTrip {
  return {
    id: row.id,
    from: row.from_city,
    to: row.to_city,
    date: row.trip_date,
    time: row.trip_time,
    price: row.price,
    status: tripStatus(row),
    driverName: row.driver_name,
  };
}

export async function listAdminTrips(search?: string): Promise<AdminTrip[]> {
  const rows = await sql<AdminTripRow[]>`
    SELECT id, from_city, to_city, trip_date, trip_time, price, driver_name,
           cancelled_at, driver_confirmed_at, passenger_confirmed_at,
           driver_completed_at, passenger_completed_at
    FROM trips
    ${
      search
        ? sql`WHERE from_city ILIKE ${`%${search}%`} OR to_city ILIKE ${`%${search}%`}`
        : sql``
    }
    ORDER BY id DESC
  `;

  return rows.map(toAdminTrip);
}

export type UpdateAdminTripInput = {
  price?: number;
  date?: string;
};

export async function updateAdminTrip(
  tripId: number,
  input: UpdateAdminTripInput
): Promise<boolean> {
  if (input.price === undefined && input.date === undefined) return false;

  const patch: Record<string, unknown> = {};

  if (input.price !== undefined) patch.price = input.price;
  if (input.date !== undefined) patch.trip_date = input.date;

  const result = await sql`
    UPDATE trips SET ${sql(patch)} WHERE id = ${tripId}
  `;

  return result.count > 0;
}

export async function adminCancelTrip(tripId: number): Promise<boolean> {
  const [tripResult] = await Promise.all([
    sql`
      UPDATE trips SET cancelled_at = COALESCE(
        cancelled_at,
        to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
      )
      WHERE id = ${tripId}
    `,
    sql`
      UPDATE taxi_orders SET status = 'cancelled'
      WHERE trip_id = ${tripId} AND status != 'cancelled'
    `,
  ]);

  return tripResult.count > 0;
}

/** Отменяет отмену: возвращает поездку в исходный статус (снимает cancelled_at). */
export async function adminRestoreTrip(tripId: number): Promise<boolean> {
  const result = await sql<{ id: number }[]>`
    UPDATE trips SET cancelled_at = NULL
    WHERE id = ${tripId} AND cancelled_at IS NOT NULL
    RETURNING id
  `;

  return result.length > 0;
}

export type AdminReview = {
  id: number;
  authorName: string;
  rating: number;
  comment: string | null;
  tripRoute: string;
  tripId: number;
  tripType: "intercity" | "city";
};

type AdminReviewRow = {
  id: number;
  author_name: string;
  rating: number;
  comment: string | null;
  trip_id: number;
  from_city: string;
  to_city: string;
  trip_type: "intercity" | "city";
};

export async function listAdminReviews(
  minRating?: number,
  tripType?: "intercity" | "city"
): Promise<AdminReview[]> {
  const rows = await sql<AdminReviewRow[]>`
    SELECT reviews.id as id, users.name as author_name, reviews.rating as rating,
           reviews.comment as comment, reviews.trip_id as trip_id,
           trips.from_city as from_city, trips.to_city as to_city,
           trips.type as trip_type
    FROM reviews
    JOIN users ON users.id = reviews.reviewer_id
    JOIN trips ON trips.id = reviews.trip_id
    WHERE 1=1
    ${minRating ? sql`AND reviews.rating >= ${minRating}` : sql``}
    ${tripType ? sql`AND trips.type = ${tripType}` : sql``}
    ORDER BY reviews.id DESC
  `;

  return rows.map((r) => ({
    id: r.id,
    authorName: r.author_name,
    rating: r.rating,
    comment: r.comment,
    tripId: r.trip_id,
    tripRoute: `${r.from_city} → ${r.to_city}`,
    tripType: r.trip_type,
  }));
}

export async function deleteAdminReview(reviewId: number): Promise<boolean> {
  const result = await sql`DELETE FROM reviews WHERE id = ${reviewId}`;

  return result.count > 0;
}

export type AdminReportStatus = "new" | "resolved";

export type AdminReport = {
  id: number;
  category: string;
  description: string | null;
  status: AdminReportStatus;
  reporterName: string;
  tripId: number;
  tripRoute: string;
  createdAt: string;
};

type AdminReportRow = {
  id: number;
  category: string;
  description: string | null;
  status: AdminReportStatus;
  reporter_name: string;
  trip_id: number;
  from_city: string;
  to_city: string;
  created_at: string;
};

export async function listAdminReports(
  status?: AdminReportStatus
): Promise<AdminReport[]> {
  const rows = await sql<AdminReportRow[]>`
    SELECT trip_reports.id as id, trip_reports.category as category,
           trip_reports.description as description, trip_reports.status as status,
           trip_reports.created_at as created_at, users.name as reporter_name,
           trips.id as trip_id, trips.from_city as from_city, trips.to_city as to_city
    FROM trip_reports
    JOIN users ON users.id = trip_reports.reporter_id
    JOIN trips ON trips.id = trip_reports.trip_id
    ${status ? sql`WHERE trip_reports.status = ${status}` : sql``}
    ORDER BY trip_reports.id DESC
  `;

  return rows.map((r) => ({
    id: r.id,
    category: r.category,
    description: r.description,
    status: r.status,
    reporterName: r.reporter_name,
    tripId: r.trip_id,
    tripRoute: `${r.from_city} → ${r.to_city}`,
    createdAt: r.created_at,
  }));
}

export async function resolveReport(reportId: number): Promise<boolean> {
  const result = await sql`
    UPDATE trip_reports SET status = 'resolved' WHERE id = ${reportId}
  `;

  return result.count > 0;
}

const PASSWORD_ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";

function generateTempPassword(length = 10): string {
  const bytes = crypto.randomBytes(length);
  let password = "";

  for (let i = 0; i < length; i++) {
    password += PASSWORD_ALPHABET[bytes[i] % PASSWORD_ALPHABET.length];
  }

  return password;
}

export async function resetUserPassword(userId: number): Promise<string | null> {
  const password = generateTempPassword();
  const passwordHash = await hashPassword(password);

  const result = await sql`
    UPDATE users SET password_hash = ${passwordHash} WHERE id = ${userId}
  `;

  return result.count > 0 ? password : null;
}

export async function deleteAdminUser(userId: number): Promise<boolean> {
  return sql.begin(async (tx) => {
    const ownedTrips = await tx<{ id: number }[]>`
      SELECT id FROM trips WHERE owner_id = ${userId}
    `;
    const ownedTripIds = ownedTrips.map((t) => t.id);

    if (ownedTripIds.length > 0) {
      await tx`DELETE FROM reviews WHERE trip_id = ANY(${ownedTripIds})`;
      await tx`DELETE FROM trip_reports WHERE trip_id = ANY(${ownedTripIds})`;
      await tx`DELETE FROM chat_messages WHERE trip_id = ANY(${ownedTripIds})`;
      await tx`DELETE FROM trip_participants WHERE trip_id = ANY(${ownedTripIds})`;
      await tx`UPDATE taxi_orders SET trip_id = NULL WHERE trip_id = ANY(${ownedTripIds})`;
    }

    await tx`DELETE FROM reviews WHERE reviewer_id = ${userId} OR reviewee_id = ${userId}`;
    await tx`DELETE FROM trip_reports WHERE reporter_id = ${userId}`;
    await tx`DELETE FROM chat_messages WHERE user_id = ${userId}`;
    await tx`DELETE FROM trip_participants WHERE user_id = ${userId}`;
    await tx`DELETE FROM taxi_orders WHERE passenger_id = ${userId} OR driver_id = ${userId}`;

    if (ownedTripIds.length > 0) {
      await tx`DELETE FROM trips WHERE id = ANY(${ownedTripIds})`;
    }

    const result = await tx`DELETE FROM users WHERE id = ${userId}`;

    return result.count > 0;
  });
}

export type AdminTaxiOrder = {
  id: number;
  from: string;
  to: string;
  price: number;
  seats: number;
  status: "open" | "accepted" | "cancelled";
  passengerName: string;
  driverName: string | null;
  tripId: number | null;
  createdAt: string;
};

type AdminTaxiOrderRow = {
  id: number;
  from_address: string;
  to_address: string;
  price: number;
  seats: number;
  status: "open" | "accepted" | "cancelled";
  passenger_name: string;
  driver_name: string | null;
  trip_id: number | null;
  created_at: string;
};

export async function listAdminTaxiOrders(status?: string): Promise<AdminTaxiOrder[]> {
  const rows = await sql<AdminTaxiOrderRow[]>`
    SELECT taxi_orders.id as id, taxi_orders.from_address as from_address,
           taxi_orders.to_address as to_address, taxi_orders.price as price,
           taxi_orders.seats as seats, taxi_orders.status as status,
           passenger.name as passenger_name, driver.name as driver_name,
           taxi_orders.trip_id as trip_id, taxi_orders.created_at as created_at
    FROM taxi_orders
    JOIN users passenger ON passenger.id = taxi_orders.passenger_id
    LEFT JOIN users driver ON driver.id = taxi_orders.driver_id
    ${status ? sql`WHERE taxi_orders.status = ${status}` : sql``}
    ORDER BY taxi_orders.created_at DESC
    LIMIT 200
  `;

  return rows.map((r) => ({
    id: r.id,
    from: r.from_address,
    to: r.to_address,
    price: r.price,
    seats: r.seats,
    status: r.status,
    passengerName: r.passenger_name,
    driverName: r.driver_name,
    tripId: r.trip_id,
    createdAt: r.created_at,
  }));
}

export async function adminCancelTaxiOrder(orderId: number): Promise<boolean> {
  const result = await sql`
    UPDATE taxi_orders SET status = 'cancelled'
    WHERE id = ${orderId} AND status = 'open'
  `;

  return result.count > 0;
}
