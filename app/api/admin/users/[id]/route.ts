import { NextRequest, NextResponse } from "next/server";

import { requireAdmin, setAdminUserRole } from "@/lib/admin";
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

  const limit = rateLimit(`admin-users:${admin.id}`, { limit: 30, windowMs: 60_000 });

  if (!limit.allowed) {
    return NextResponse.json({ error: "Слишком много запросов" }, { status: 429 });
  }

  const { id } = await params;
  const userId = Number(id);

  if (!Number.isInteger(userId) || userId <= 0) {
    return NextResponse.json({ error: "Некорректный пользователь" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const role = typeof body?.role === "string" ? body.role : "";

  const ok = await setAdminUserRole(userId, role);

  if (!ok) {
    return NextResponse.json(
      { error: "Не удалось изменить роль" },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}
