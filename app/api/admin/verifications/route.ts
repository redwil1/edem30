import { NextResponse } from "next/server";

import { requireStaff } from "@/lib/admin";
import { listPendingVerifications } from "@/lib/verification";

export const runtime = "nodejs";

export async function GET() {
  const admin = await requireStaff();

  if (!admin) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const verifications = await listPendingVerifications();

  return NextResponse.json(
    { verifications },
    { headers: { "Cache-Control": "no-store" } }
  );
}
