import { NextResponse } from "next/server";

import { requireStaff } from "@/lib/admin";
import { listTelegramMessages } from "@/lib/telegramBot";

export const runtime = "nodejs";

export async function GET() {
  const admin = await requireStaff();

  if (!admin) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  return NextResponse.json(
    { messages: await listTelegramMessages() },
    { headers: { "Cache-Control": "no-store" } }
  );
}
