import "server-only";

import { sql } from "@/lib/db";
import { sendPushToStaff, sendPushToUser } from "@/lib/push";
import { getListingOwnerId } from "@/lib/marketplace";
import {
  MarketplaceReportCategory,
  marketplaceReportCategoryLabel,
} from "@/data/marketplaceReportCategories";

export type CreateMarketplaceReportInput = {
  listingId: number;
  reporterId: number;
  category: MarketplaceReportCategory;
  description?: string;
};

export async function createMarketplaceReport(input: CreateMarketplaceReportInput): Promise<void> {
  const ownerId = await getListingOwnerId(input.listingId);

  await sql`
    INSERT INTO marketplace_reports (listing_id, reporter_id, category, description)
    VALUES (${input.listingId}, ${input.reporterId}, ${input.category}, ${input.description ?? null})
  `;

  if (ownerId && ownerId !== input.reporterId) {
    sendPushToUser(ownerId, {
      title: "На ваше объявление поступила жалоба",
      body: "Администрация рассмотрит обращение",
      url: "/marketplace/mine",
    });
  }

  sendPushToStaff({
    title: "Новая жалоба на объявление",
    body: marketplaceReportCategoryLabel(input.category),
    url: "/eadmin30",
  });
}

export type MarketplaceReportRow = {
  id: number;
  listingId: number;
  listingTitle: string;
  listingOwnerId: number;
  listingOwnerName: string;
  reporterId: number;
  reporterName: string;
  category: string;
  description: string | null;
  createdAt: string;
  seenAt: string | null;
};

export async function listMarketplaceReports(): Promise<MarketplaceReportRow[]> {
  return sql<MarketplaceReportRow[]>`
    SELECT
      marketplace_reports.id as id,
      marketplace_reports.listing_id as "listingId",
      marketplace_listings.title as "listingTitle",
      marketplace_listings.owner_id as "listingOwnerId",
      owner.name as "listingOwnerName",
      marketplace_reports.reporter_id as "reporterId",
      reporter.name as "reporterName",
      marketplace_reports.category as category,
      marketplace_reports.description as description,
      marketplace_reports.created_at as "createdAt",
      marketplace_reports.seen_at as "seenAt"
    FROM marketplace_reports
    JOIN marketplace_listings ON marketplace_listings.id = marketplace_reports.listing_id
    JOIN users owner ON owner.id = marketplace_listings.owner_id
    JOIN users reporter ON reporter.id = marketplace_reports.reporter_id
    ORDER BY marketplace_reports.id DESC
    LIMIT 100
  `;
}

export async function markMarketplaceReportSeen(id: number): Promise<void> {
  await sql`
    UPDATE marketplace_reports
    SET seen_at = to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    WHERE id = ${id}
  `;
}
