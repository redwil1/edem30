import { NextResponse } from "next/server";

import { requireStaff } from "@/lib/admin";
import { listSupportConversations } from "@/lib/conversations";

export async function GET() {
  const staff = await requireStaff();

  if (!staff) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const rows = await listSupportConversations();

  return NextResponse.json(
    {
      conversations: rows.map((c) => ({
        userId: c.subjectUserId,
        name: c.subjectName,
        phone: c.subjectPhone,
        avatarUrl: c.subjectAvatarUrl,
        avatarPreset: c.subjectAvatarPreset,
        lastMessageAt: c.lastMessageAt,
        lastMessageText: c.lastMessageText,
        needsReply: c.lastMessageSenderId === c.subjectUserId,
      })),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
