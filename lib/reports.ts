import "server-only";

import { sql } from "@/lib/db";
import { ReportCategory, reportCategoryLabel } from "@/lib/reportCategories";
import { sendPushToStaff, sendPushToUser } from "@/lib/push";

export type CreateReportInput = {
  tripId: number;
  reporterId: number;
  category: ReportCategory;
  description?: string;
};

async function getReportedUserId(
  tripId: number,
  reporterId: number
): Promise<number | null> {
  const [ownerRows, participants] = await Promise.all([
    sql<{ owner_id: number | null }[]>`SELECT owner_id FROM trips WHERE id = ${tripId}`,
    sql<{ user_id: number }[]>`SELECT user_id FROM trip_participants WHERE trip_id = ${tripId}`,
  ]);

  const ownerId = ownerRows[0]?.owner_id ?? null;

  if (ownerId !== null && ownerId !== reporterId) {
    return ownerId;
  }

  if (ownerId === reporterId && participants.length === 1) {
    return participants[0].user_id;
  }

  return null;
}

export async function createReport(input: CreateReportInput): Promise<void> {
  const reportedUserId = await getReportedUserId(input.tripId, input.reporterId);

  if (reportedUserId !== null) {
    sendPushToUser(reportedUserId, {
      title: "На вас поступила жалоба",
      body: "Администрация рассмотрит обращение по одной из ваших поездок",
      url: "/profile",
    });
  }

  await sql`
    INSERT INTO trip_reports (trip_id, reporter_id, reported_user_id, category, description)
    VALUES (${input.tripId}, ${input.reporterId}, ${reportedUserId}, ${input.category}, ${input.description ?? null})
  `;

  sendPushToStaff({
    title: "Новая жалоба",
    body: reportCategoryLabel(input.category),
    url: "/eadmin30",
  });
}

export type PendingComplaintNotice = {
  reportId: number;
  tripRoute: string;
  tripId: number;
  createdAt: string;
};

export async function getPendingComplaintNotices(
  userId: number
): Promise<PendingComplaintNotice[]> {
  const rows = await sql<
    { id: number; trip_id: number; from_city: string; to_city: string; created_at: string }[]
  >`
    SELECT trip_reports.id as id, trip_reports.trip_id as trip_id,
           trips.from_city as from_city, trips.to_city as to_city,
           trip_reports.created_at as created_at
    FROM trip_reports
    JOIN trips ON trips.id = trip_reports.trip_id
    WHERE trip_reports.reported_user_id = ${userId}
      AND trip_reports.seen_at IS NULL
    ORDER BY trip_reports.id ASC
  `;

  return rows.map((r) => ({
    reportId: r.id,
    tripId: r.trip_id,
    tripRoute: `${r.from_city} → ${r.to_city}`,
    createdAt: r.created_at,
  }));
}

export async function markComplaintNoticesSeen(
  userId: number,
  reportIds: number[]
): Promise<void> {
  if (reportIds.length === 0) return;

  await sql`
    UPDATE trip_reports
    SET seen_at = to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    WHERE reported_user_id = ${userId} AND id = ANY(${reportIds})
  `;
}
