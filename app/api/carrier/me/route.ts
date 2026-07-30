import { NextResponse } from "next/server";

import { requireCarrierOperator } from "@/lib/carriers";

export const runtime = "nodejs";

export async function GET() {
  const operator = await requireCarrierOperator();

  return NextResponse.json(
    { linked: !!operator, carrierName: operator?.carrier.name ?? null },
    { headers: { "Cache-Control": "no-store" } }
  );
}
