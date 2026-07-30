import { NextRequest, NextResponse } from "next/server";

import { getCarrierAnalytics, getCarrierForAdminView, requireCarrierOperator } from "@/lib/carriers";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const operator = await requireCarrierOperator();
  const adminCarrierId = Number(req.nextUrl.searchParams.get("carrierId"));

  const carrier = operator
    ? operator.carrier
    : Number.isInteger(adminCarrierId) && adminCarrierId > 0
    ? await getCarrierForAdminView(adminCarrierId)
    : null;

  if (!carrier) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const analytics = await getCarrierAnalytics(carrier.id);

  return NextResponse.json(analytics, { headers: { "Cache-Control": "no-store" } });
}
