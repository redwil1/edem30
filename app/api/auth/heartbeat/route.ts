import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

export async function POST() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  await sql`UPDATE users SET last_seen_at = ${new Date().toISOString()} WHERE id = ${user.id}`;

  return NextResponse.json({ ok: true });
}
