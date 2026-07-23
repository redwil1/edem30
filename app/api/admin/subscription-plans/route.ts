import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin";
import { createSubscriptionPlan, listSubscriptionPlans } from "@/lib/subscriptionPlans";
import { rateLimit } from "@/lib/rateLimit";
import { isTrustedOrigin } from "@/lib/security";

export const runtime = "nodejs";

export async function GET() {
  const admin = await requireAdmin();

  if (!admin) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  return NextResponse.json(
    { plans: await listSubscriptionPlans() },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(req: NextRequest) {
  if (!isTrustedOrigin(req)) {
    return NextResponse.json(
      { error: "Недопустимый источник запроса" },
      { status: 403 }
    );
  }

  const admin = await requireAdmin();

  if (!admin) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  const limit = rateLimit(`admin-plan-create:${admin.id}`, { limit: 20, windowMs: 60_000 });

  if (!limit.allowed) {
    return NextResponse.json({ error: "Слишком много запросов" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);

  const name = typeof body?.name === "string" ? body.name : "";
  const price = Number(body?.price);
  const durationDays = Number(body?.durationDays);
  const description =
    typeof body?.description === "string" && body.description.trim()
      ? body.description.trim().slice(0, 300)
      : null;

  const result = await createSubscriptionPlan({ name, price, durationDays, description });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ plan: result });
}
