import { NextRequest, NextResponse } from "next/server";

import { requireAdmin, resolveReport } from "@/lib/admin";
import { rateLimit } from "@/lib/rateLimit";
import { isTrustedOrigin } from "@/lib/security";

export const runtime = "nodejs";

type Props = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: NextRequest, { params }: Props) {
  if (!isTrustedOrigin(req)) {
    return NextResponse.json(
      { error: "Недопустимый источник запроса" },
      { status: 403 }
    );
  }

  const admin = await requireAdmin();

  if (!admin) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const limit = rateLimit(`admin-report-resolve:${admin.id}`, {
    limit: 30,
    windowMs: 60_000,
  });

  if (!limit.allowed) {
    return NextResponse.json({ error: "Слишком много запросов" }, { status: 429 });
  }

  const { id } = await params;
  const reportId = Number(id);

  if (!Number.isInteger(reportId) || reportId <= 0) {
    return NextResponse.json({ error: "Некорректная жалоба" }, { status: 400 });
  }

  const ok = await resolveReport(reportId);

  if (!ok) {
    return NextResponse.json({ error: "Жалоба не найдена" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
