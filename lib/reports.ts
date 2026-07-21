import "server-only";

import { sql } from "@/lib/db";
import { ReportCategory } from "@/lib/reportCategories";

export type CreateReportInput = {
  tripId: number;
  reporterId: number;
  category: ReportCategory;
  description?: string;
};

export async function createReport(input: CreateReportInput): Promise<void> {
  await sql`
    INSERT INTO trip_reports (trip_id, reporter_id, category, description)
    VALUES (${input.tripId}, ${input.reporterId}, ${input.category}, ${input.description ?? null})
  `;
}
