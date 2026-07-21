import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";
import { isTrustedOrigin } from "@/lib/security";
import { getTripOwnerId } from "@/lib/trips";
import { createReport } from "@/lib/reports";
import { isValidReportCategory } from "@/lib/reportCategories";

export const runtime = "nodejs";

type Props = {
  params: Promise<{ id: string }>;
};

export async function POST(req: NextRequest, { params }: Props) {
  if (!isTrustedOrigin(req)) {
    return NextResponse.json(
      { error: "Недопустимый источник запроса" },
      { status: 403 }
    );
  }

  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: "Войдите, чтобы пожаловаться на поездку" },
      { status: 401 }
    );
  }

  const limit = rateLimit(`report:${user.id}`, {
    limit: 5,
    windowMs: 60 * 60_000,
  });

  if (!limit.allowed) {
    return NextResponse.json({ error: "Слишком много запросов" }, { status: 429 });
  }

  const { id } = await params;
  const tripId = Number(id);

  if (!Number.isInteger(tripId) || tripId <= 0) {
    return NextResponse.json({ error: "Некорректная поездка" }, { status: 400 });
  }

  if (!(await getTripOwnerId(tripId))) {
    return NextResponse.json({ error: "Поездка не найдена" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);

  if (!isValidReportCategory(body?.category)) {
    return NextResponse.json(
      { error: "Укажите категорию жалобы" },
      { status: 400 }
    );
  }

  const description =
    typeof body?.description === "string"
      ? body.description.trim().slice(0, 500)
      : "";

  await createReport({
    tripId,
    reporterId: user.id,
    category: body.category,
    description: description || undefined,
  });

  return NextResponse.json({ ok: true });
}
