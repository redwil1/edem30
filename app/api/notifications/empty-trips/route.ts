import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getEmptyTripWarnings } from "@/lib/trips";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();

  if (!user || user.role !== "driver") {
    return NextResponse.json(
      { warnings: [] },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  const warnings = await getEmptyTripWarnings(user.id);

  return NextResponse.json(
    { warnings },
    { headers: { "Cache-Control": "no-store" } }
  );
}
