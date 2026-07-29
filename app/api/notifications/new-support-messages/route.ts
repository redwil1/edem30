import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getRecentAdminRepliesForUser, getRecentUserMessagesForStaff } from "@/lib/conversations";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ messages: [] });
  }

  const isStaff = user.role === "admin" || user.role === "moderator";

  if (isStaff) {
    const rows = await getRecentUserMessagesForStaff();

    return NextResponse.json(
      {
        messages: rows.map((m) => ({
          id: m.id,
          senderName: `${m.subjectName} (поддержка)`,
          preview: m.text,
          url: "/eadmin30",
        })),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  const rows = await getRecentAdminRepliesForUser(user.id);

  return NextResponse.json(
    {
      messages: rows.map((m) => ({
        id: m.id,
        senderName: "Поддержка Едем30",
        preview: m.text,
        url: "/chat",
      })),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
