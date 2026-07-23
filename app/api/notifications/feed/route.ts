import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getNotificationFeed } from "@/lib/notificationsFeed";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ items: [] });
  }

  const items = await getNotificationFeed(user.id, user.role);

  return NextResponse.json(
    { items },
    { headers: { "Cache-Control": "no-store" } }
  );
}
