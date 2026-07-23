import { NextRequest, NextResponse } from "next/server";

import { AdminUserFilter, listAdminUsers, requireAdmin } from "@/lib/admin";

export const runtime = "nodejs";

const VALID_FILTERS: AdminUserFilter[] = ["all", "driver", "passenger", "blocked", "noname"];

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();

  if (!admin) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const search = req.nextUrl.searchParams.get("search")?.trim() || undefined;
  const filterParam = req.nextUrl.searchParams.get("filter") ?? "all";
  const filter = VALID_FILTERS.includes(filterParam as AdminUserFilter)
    ? (filterParam as AdminUserFilter)
    : "all";

  return NextResponse.json(
    { users: await listAdminUsers(search, filter) },
    { headers: { "Cache-Control": "no-store" } }
  );
}
