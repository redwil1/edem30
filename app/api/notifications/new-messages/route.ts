import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getRecentChatMessagesForUser } from "@/lib/trips";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ messages: [] });
  }

  const messages = await getRecentChatMessagesForUser(user.id);

  return NextResponse.json(
    { messages },
    { headers: { "Cache-Control": "no-store" } }
  );
}
