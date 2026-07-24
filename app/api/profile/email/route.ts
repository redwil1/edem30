import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }

  const rows = await sql<{ email: string | null }[]>`
    SELECT email FROM users WHERE id = ${user.id}
  `;

  return NextResponse.json({ email: rows[0]?.email ?? null });
}
