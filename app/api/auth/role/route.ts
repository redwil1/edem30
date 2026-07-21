import { NextRequest, NextResponse } from "next/server";

import { getCurrentUser, setUserRole } from "@/lib/auth";
import { isTrustedOrigin } from "@/lib/security";

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

  const body = await req.json().catch(() => null);

  const role = body?.role === "driver" ? "driver" : "passenger";

  setUserRole(user.id, role);

  return NextResponse.json({ role });
}
