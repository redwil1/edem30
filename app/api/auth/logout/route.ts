import { NextRequest, NextResponse } from "next/server";

import { deleteSession } from "@/lib/auth";
import { isTrustedOrigin } from "@/lib/security";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!isTrustedOrigin(req)) {
    return NextResponse.json({ error: "Недопустимый источник запроса" }, { status: 403 });
  }

  await deleteSession();

  return NextResponse.json({ ok: true });
}
