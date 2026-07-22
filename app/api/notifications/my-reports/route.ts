import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { isTrustedOrigin } from "@/lib/security";
import { getPendingComplaintNotices, markComplaintNoticesSeen } from "@/lib/reports";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { notices: [] },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  const notices = await getPendingComplaintNotices(user.id);

  return NextResponse.json(
    { notices },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(req: NextRequest) {
  if (!isTrustedOrigin(req)) {
    return NextResponse.json(
      { error: "Недопустимый источник запроса" },
      { status: 403 }
    );
  }

  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Войдите в аккаунт" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const reportIds = Array.isArray(body?.reportIds)
    ? body.reportIds.filter((n: unknown) => Number.isInteger(n))
    : [];

  await markComplaintNoticesSeen(user.id, reportIds);

  return NextResponse.json({ ok: true });
}
