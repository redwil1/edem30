import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ linked: false });
  }

  const rows = await sql<{ telegram_id: string | null }[]>`
    SELECT telegram_id FROM users WHERE id = ${user.id}
  `;

  return NextResponse.json(
    { linked: Boolean(rows[0]?.telegram_id) },
    { headers: { "Cache-Control": "no-store" } }
  );
}
