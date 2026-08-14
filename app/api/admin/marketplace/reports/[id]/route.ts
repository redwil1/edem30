import { NextRequest, NextResponse } from "next/server";

import { requireStaff } from "@/lib/admin";
import { isTrustedOrigin } from "@/lib/security";
import { markMarketplaceReportSeen } from "@/lib/marketplaceReports";

export const runtime = "nodejs";

type Props = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Props) {
  if (!isTrustedOrigin(req)) {
    return NextResponse.json({ error: "Недопустимый источник запроса" }, { status: 403 });
  }

  const staff = await requireStaff();

  if (!staff) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const { id } = await params;
  const reportId = Number(id);

  if (!Number.isInteger(reportId) || reportId <= 0) {
    return NextResponse.json({ error: "Некорректная жалоба" }, { status: 400 });
  }

  await markMarketplaceReportSeen(reportId);

  return NextResponse.json({ ok: true });
}
