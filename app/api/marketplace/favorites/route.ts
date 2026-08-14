import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { listFavoriteListings } from "@/lib/marketplace";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Войдите в аккаунт" }, { status: 401 });
  }

  const listings = await listFavoriteListings(user.id);

  return NextResponse.json({ listings }, { headers: { "Cache-Control": "no-store" } });
}
