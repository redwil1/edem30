import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getLatestOrderForPassenger } from "@/lib/taxiOrders";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Войдите в аккаунт" }, { status: 401 });
  }

  const order = (await getLatestOrderForPassenger(user.id)) ?? null;

  return NextResponse.json(
    { order },
    { headers: { "Cache-Control": "no-store" } }
  );
}
