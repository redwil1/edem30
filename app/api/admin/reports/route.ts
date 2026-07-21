import { NextRequest, NextResponse } from "next/server";

import { listAdminReports, requireAdmin, AdminReportStatus } from "@/lib/admin";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();

  if (!admin) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const statusParam = req.nextUrl.searchParams.get("status");
  const status =
    statusParam === "new" || statusParam === "resolved"
      ? (statusParam as AdminReportStatus)
      : undefined;

  return NextResponse.json(
    { reports: await listAdminReports(status) },
    { headers: { "Cache-Control": "no-store" } }
  );
}
