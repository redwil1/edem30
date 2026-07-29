import { NextResponse } from "next/server";

import { requireStaff } from "@/lib/admin";
import { listSupportConversations } from "@/lib/conversations";
import { isOnline } from "@/lib/utils";

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
        online: isOnline(c.subjectLastSeenAt),
        lastMessageAt: c.lastMessageAt,
        lastMessageText: c.lastMessageText,
        lastMessageAttachmentType: c.lastMessageAttachmentType,
        needsReply: c.lastMessageSenderId === c.subjectUserId,
        unreadCount: c.unreadCount,
      })),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
