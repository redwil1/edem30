import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getBlockingTripInfo } from "@/lib/trips";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ alert: null });
  }

  const blocking = await getBlockingTripInfo(user.id);

  if (!blocking || blocking.requiredRole === user.role) {
    return NextResponse.json(
      { alert: null },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  return NextResponse.json(
    { alert: blocking },
    { headers: { "Cache-Control": "no-store" } }
  );
}
