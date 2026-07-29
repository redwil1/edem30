import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { listMyRideRequests, listResponsesForRequest } from "@/lib/rideRequests";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Войдите в аккаунт" }, { status: 401 });
  }

  const requests = await listMyRideRequests(user.id);

  const withResponses = await Promise.all(
    requests.map(async (r) => ({
      ...r,
      responses: r.status === "open" || r.responsesCount > 0 ? await listResponsesForRequest(r.id) : [],
    }))
  );

  return NextResponse.json(
    { requests: withResponses },
    { headers: { "Cache-Control": "no-store" } }
  );
}
