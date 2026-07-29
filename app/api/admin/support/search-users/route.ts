import { NextRequest, NextResponse } from "next/server";

import { requireStaff } from "@/lib/admin";
import { searchUsersForSupport } from "@/lib/conversations";

export async function GET(req: NextRequest) {
  const staff = await requireStaff();

  if (!staff) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (q.length < 2) {
    return NextResponse.json({ users: [] });
  }

  const rows = await searchUsersForSupport(q);

  return NextResponse.json({ users: rows });
}
