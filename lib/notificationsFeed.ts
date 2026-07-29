import "server-only";

import { getRecentChatMessagesForUser, getPendingReviewPrompt } from "@/lib/trips";
import { getPendingComplaintNotices } from "@/lib/reports";
import { listOpenOrders } from "@/lib/taxiOrders";
import { listAdminReports, getRecentSignups } from "@/lib/admin";
import { getRecentAdminRepliesForUser, getRecentUserMessagesForStaff } from "@/lib/conversations";

export type FeedItemType =
  | "message"
  | "complaint"
  | "review"
  | "order"
  | "staffReport"
  | "newUser"
  | "support";

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

  const [messages, complaints, review, orders, staffReports, signups, adminReplies, userSupportMessages] =
    await Promise.all([
      getRecentChatMessagesForUser(userId),
      getPendingComplaintNotices(userId),
      getPendingReviewPrompt(userId),
      role === "driver" ? listOpenOrders(userId) : Promise.resolve([]),
      isStaff ? listAdminReports("new") : Promise.resolve([]),
      isStaff ? getRecentSignups(10) : Promise.resolve([]),
      getRecentAdminRepliesForUser(userId),
      isStaff ? getRecentUserMessagesForStaff() : Promise.resolve([]),
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

  for (const m of adminReplies) {
    items.push({
      id: `support-${m.id}`,
      type: "support",
      title: "Поддержка Едем30",
      body: m.text,
      url: "/profile#support-chat",
      createdAt: m.createdAt,
    });
  }

  for (const m of userSupportMessages) {
    items.push({
      id: `support-staff-${m.id}`,
      type: "support",
      title: `${m.subjectName}: сообщение в поддержку`,
      body: m.text,
      url: "/eadmin30",
      createdAt: m.createdAt,
    });
  }

  for (const s of signups) {
    items.push({
      id: `newUser-${s.id}`,
      type: "newUser",
      title: "Новый пользователь",
      body: s.phone ? `${s.name} · +${s.phone}` : s.name,
      url: "/eadmin30",
      createdAt: s.createdAt,
    });
  }

  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return items.slice(0, 30);
}
