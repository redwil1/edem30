import "server-only";

import { sql } from "@/lib/db";
import { TRAFFIC_SOURCES, TrafficSource } from "@/lib/traffic";

export type MarketingPeriod = "today" | "week" | "month" | "all";

export type SourceRow = {
  source: TrafficSource;
  visits: number;
  registrations: number;
  trips: number;
  taxiOrders: number;
  conversion: number;
};

export type MarketingStats = {
  periods: Record<
    MarketingPeriod,
    {
      sources: SourceRow[];
      totalVisits: number;
      totalRegistrations: number;
      totalTrips: number;
      totalTaxiOrders: number;
    }
  >;
  visitors: {
    today: { new: number; returning: number };
    week: { new: number; returning: number };
    month: { new: number; returning: number };
    allTimeTotal: number;
  };
};

type CountRow = { source: string; today: string; week: string; month: string; all_time: string };

function normalizeSource(raw: string): TrafficSource {
  return (TRAFFIC_SOURCES as string[]).includes(raw) ? (raw as TrafficSource) : "other";
}

function emptySourceMap(): Record<TrafficSource, SourceRow> {
  const map = {} as Record<TrafficSource, SourceRow>;

  for (const source of TRAFFIC_SOURCES) {
    map[source] = { source, visits: 0, registrations: 0, trips: 0, taxiOrders: 0, conversion: 0 };
  }

  return map;
}

export async function getMarketingStats(): Promise<MarketingStats> {
  const [visitRows, registrationRows, tripRows, taxiOrderRows, visitorRows, allTimeVisitors] =
    await Promise.all([
      sql<CountRow[]>`
        SELECT
          COALESCE(source, 'other') as source,
          COUNT(*) FILTER (WHERE created_at::timestamptz >= date_trunc('day', now())) as today,
          COUNT(*) FILTER (WHERE created_at::timestamptz >= now() - interval '7 days') as week,
          COUNT(*) FILTER (WHERE created_at::timestamptz >= now() - interval '30 days') as month,
          COUNT(*) as all_time
        FROM site_visits
        GROUP BY COALESCE(source, 'other')
      `,
      sql<CountRow[]>`
        SELECT
          COALESCE(signup_source, 'other') as source,
          COUNT(*) FILTER (WHERE created_at::timestamptz >= date_trunc('day', now())) as today,
          COUNT(*) FILTER (WHERE created_at::timestamptz >= now() - interval '7 days') as week,
          COUNT(*) FILTER (WHERE created_at::timestamptz >= now() - interval '30 days') as month,
          COUNT(*) as all_time
        FROM users
        GROUP BY COALESCE(signup_source, 'other')
      `,
      sql<CountRow[]>`
        SELECT
          COALESCE(u.signup_source, 'other') as source,
          COUNT(*) FILTER (WHERE t.created_at::timestamptz >= date_trunc('day', now())) as today,
          COUNT(*) FILTER (WHERE t.created_at::timestamptz >= now() - interval '7 days') as week,
          COUNT(*) FILTER (WHERE t.created_at::timestamptz >= now() - interval '30 days') as month,
          COUNT(*) as all_time
        FROM trips t
        JOIN users u ON u.id = t.owner_id
        GROUP BY COALESCE(u.signup_source, 'other')
      `,
      sql<CountRow[]>`
        SELECT
          COALESCE(u.signup_source, 'other') as source,
          COUNT(*) FILTER (WHERE o.created_at::timestamptz >= date_trunc('day', now())) as today,
          COUNT(*) FILTER (WHERE o.created_at::timestamptz >= now() - interval '7 days') as week,
          COUNT(*) FILTER (WHERE o.created_at::timestamptz >= now() - interval '30 days') as month,
          COUNT(*) as all_time
        FROM taxi_orders o
        JOIN users u ON u.id = o.passenger_id
        GROUP BY COALESCE(u.signup_source, 'other')
      `,
      sql<{ new_today: string; returning_today: string; new_week: string; returning_week: string; new_month: string; returning_month: string }[]>`
        SELECT
          COUNT(DISTINCT sv.user_id) FILTER (
            WHERE sv.created_at::timestamptz >= date_trunc('day', now())
              AND u.created_at::timestamptz >= date_trunc('day', now())
          ) as new_today,
          COUNT(DISTINCT sv.user_id) FILTER (
            WHERE sv.created_at::timestamptz >= date_trunc('day', now())
              AND u.created_at::timestamptz < date_trunc('day', now())
          ) as returning_today,
          COUNT(DISTINCT sv.user_id) FILTER (
            WHERE sv.created_at::timestamptz >= now() - interval '7 days'
              AND u.created_at::timestamptz >= now() - interval '7 days'
          ) as new_week,
          COUNT(DISTINCT sv.user_id) FILTER (
            WHERE sv.created_at::timestamptz >= now() - interval '7 days'
              AND u.created_at::timestamptz < now() - interval '7 days'
          ) as returning_week,
          COUNT(DISTINCT sv.user_id) FILTER (
            WHERE sv.created_at::timestamptz >= now() - interval '30 days'
              AND u.created_at::timestamptz >= now() - interval '30 days'
          ) as new_month,
          COUNT(DISTINCT sv.user_id) FILTER (
            WHERE sv.created_at::timestamptz >= now() - interval '30 days'
              AND u.created_at::timestamptz < now() - interval '30 days'
          ) as returning_month
        FROM site_visits sv
        JOIN users u ON u.id = sv.user_id
        WHERE sv.user_id IS NOT NULL
      `,
      sql<{ c: string }[]>`SELECT COUNT(DISTINCT user_id) as c FROM site_visits WHERE user_id IS NOT NULL`,
    ]);

  const periods: MarketingPeriod[] = ["today", "week", "month", "all"];

  const maps: Record<MarketingPeriod, Record<TrafficSource, SourceRow>> = {
    today: emptySourceMap(),
    week: emptySourceMap(),
    month: emptySourceMap(),
    all: emptySourceMap(),
  };

  const periodKeyOf: Record<MarketingPeriod, keyof CountRow> = {
    today: "today",
    week: "week",
    month: "month",
    all: "all_time",
  };

  function applyCounts(rows: CountRow[], field: "visits" | "registrations" | "trips" | "taxiOrders") {
    for (const row of rows) {
      const source = normalizeSource(row.source);

      for (const period of periods) {
        maps[period][source][field] += Number(row[periodKeyOf[period]]);
      }
    }
  }

  applyCounts(visitRows, "visits");
  applyCounts(registrationRows, "registrations");
  applyCounts(tripRows, "trips");
  applyCounts(taxiOrderRows, "taxiOrders");

  const result: MarketingStats["periods"] = {} as MarketingStats["periods"];

  for (const period of periods) {
    const sources = TRAFFIC_SOURCES.map((source) => {
      const row = maps[period][source];
      const conversion = row.visits > 0 ? (row.registrations / row.visits) * 100 : 0;

      return { ...row, conversion: Math.round(conversion * 10) / 10 };
    });

    result[period] = {
      sources,
      totalVisits: sources.reduce((s, r) => s + r.visits, 0),
      totalRegistrations: sources.reduce((s, r) => s + r.registrations, 0),
      totalTrips: sources.reduce((s, r) => s + r.trips, 0),
      totalTaxiOrders: sources.reduce((s, r) => s + r.taxiOrders, 0),
    };
  }

  const v = visitorRows[0];

  return {
    periods: result,
    visitors: {
      today: { new: Number(v?.new_today ?? 0), returning: Number(v?.returning_today ?? 0) },
      week: { new: Number(v?.new_week ?? 0), returning: Number(v?.returning_week ?? 0) },
      month: { new: Number(v?.new_month ?? 0), returning: Number(v?.returning_month ?? 0) },
      allTimeTotal: Number(allTimeVisitors[0]?.c ?? 0),
    },
  };
}
