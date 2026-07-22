import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getPendingReviewPrompt } from "@/lib/trips";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ pending: null });
  }

  const pending = await getPendingReviewPrompt(user.id);

  return NextResponse.json(
    { pending },
    { headers: { "Cache-Control": "no-store" } }
  );
}
