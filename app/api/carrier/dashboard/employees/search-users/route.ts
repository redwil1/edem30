import { NextRequest, NextResponse } from "next/server";

import { requireCarrierOperator } from "@/lib/carriers";
import { searchUsersForSupport } from "@/lib/conversations";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const operator = await requireCarrierOperator();
  if (!operator || operator.role !== "manager") {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ users: [] });
  }

  const users = await searchUsersForSupport(q);

  return NextResponse.json({ users });
}
