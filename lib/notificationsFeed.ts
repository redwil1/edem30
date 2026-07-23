import "server-only";

import { getRecentChatMessagesForUser, getPendingReviewPrompt } from "@/lib/trips";
import { getPendingComplaintNotices } from "@/lib/reports";
import { listOpenOrders } from "@/lib/taxiOrders";
import { listAdminReports } from "@/lib/admin";

export type FeedItemType = "message" | "complaint" | "review" | "order" | "staffReport";

export type FeedItem = {
  id: string;
  type: FeedItemType;
  title: string;
  body: string;
  url: string;
  createdAt: string;
};

export async function getNotificationFeed(
  userId: number,
  role: string
): Promise<FeedItem[]> {
  const isStaff = role === "admin" || role === "moderator";

  const [messages, complaints, review, orders, staffReports] = await Promise.all([
    getRecentChatMessagesForUser(userId),
    getPendingComplaintNotices(userId),
    getPendingReviewPrompt(userId),
    role === "driver" ? listOpenOrders(userId) : Promise.resolve([]),
    isStaff ? listAdminReports("new") : Promise.resolve([]),
  ]);

  const items: FeedItem[] = [];

  for (const m of messages) {
    items.push({
      id: `message-${m.id}`,
      type: "message",
      title: m.senderName,
      body: m.preview || m.routeLabel,
      url: `/trip/${m.tripId}`,
      createdAt: m.createdAt,
    });
  }

  for (const c of complaints) {
    items.push({
      id: `complaint-${c.reportId}`,
      type: "complaint",
      title: "На вас поступила жалоба",
      body: `По поездке: ${c.tripRoute}`,
      url: "/profile",
      createdAt: c.createdAt,
    });
  }

  if (review) {
    items.push({
      id: `review-${review.tripId}`,
      type: "review",
      title: "Не забудьте оставить отзыв",
      body: `Оцените ${review.revieweeName} по завершённой поездке`,
      url: `/trip/${review.tripId}`,
      createdAt: new Date().toISOString(),
    });
  }

  for (const r of staffReports.slice(0, 10)) {
    items.push({
      id: `staffReport-${r.id}`,
      type: "staffReport",
      title: "Новая жалоба",
      body: `${r.tripRoute} · ${r.reporterName}`,
      url: "/eadmin30",
      createdAt: r.createdAt,
    });
  }

  for (const o of orders.slice(0, 10)) {
    items.push({
      id: `order-${o.id}`,
      type: "order",
      title: "Новый заказ такси",
      body: `${o.from} → ${o.to} · ${o.price} ₽`,
      url: "/taxi",
      createdAt: o.createdAt,
    });
  }

  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return items.slice(0, 30);
}
