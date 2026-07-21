import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser, setUserRole } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";
import { isTrustedOrigin } from "@/lib/security";
import { getBlockingTripInfo } from "@/lib/trips";

export const runtime = "nodejs";

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

  if (user.role === "admin") {
    return NextResponse.json(
      { error: "Роль администратора нельзя изменить здесь" },
      { status: 403 }
    );
  }

  const limit = rateLimit(`role:${user.id}`, { limit: 20, windowMs: 60_000 });

  if (!limit.allowed) {
    return NextResponse.json({ error: "Слишком много запросов" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);

  const role = body?.role === "driver" ? "driver" : "passenger";

  if (role !== user.role) {
    const blocking = await getBlockingTripInfo(user.id);

    if (blocking) {
      return NextResponse.json(
        {
          error: blocking.started
            ? `Нельзя сменить роль: поездка «${blocking.route}» уже началась. Дождитесь её завершения.`
            : `Нельзя сменить роль: поездка «${blocking.route}» начнётся через ${blocking.minutesUntil} мин.`,
        },
        { status: 409 }
      );
    }
  }

  await setUserRole(user.id, role);

  return NextResponse.json({ role });
}
