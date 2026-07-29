import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { listMyRideRequests } from "@/lib/rideRequests";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Войдите в аккаунт" }, { status: 401 });
  }

  const requests = await listMyRideRequests(user.id);

  return NextResponse.json(
    { requests },
    { headers: { "Cache-Control": "no-store" } }
  );
}
