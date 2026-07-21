import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { listTripsByOwner } from "@/lib/trips";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Войдите в аккаунт" }, { status: 401 });
  }

  const trips = await listTripsByOwner(user.id);

  return NextResponse.json(
    { trips },
    { headers: { "Cache-Control": "no-store" } }
  );
}
