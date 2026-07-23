import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin";
import { listNewsletterLog, sendNewsletter } from "@/lib/newsletter";
import { BroadcastSegment } from "@/lib/push";
import { rateLimit } from "@/lib/rateLimit";
import { isTrustedOrigin } from "@/lib/security";

export const runtime = "nodejs";

const VALID_SEGMENTS: BroadcastSegment[] = ["all", "driver", "passenger"];

export async function GET() {
  const admin = await requireAdmin();

  if (!admin) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
  }

  return NextResponse.json(
    { log: await listNewsletterLog() },
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

  const limit = rateLimit(`admin-newsletter:${admin.id}`, { limit: 10, windowMs: 60_000 });

  if (!limit.allowed) {
    return NextResponse.json({ error: "Слишком много запросов" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);

  const title = typeof body?.title === "string" ? body.title : "";
  const text = typeof body?.body === "string" ? body.body : "";
  const url = typeof body?.url === "string" && body.url.trim() ? body.url.trim() : null;
  const segmentParam = typeof body?.segment === "string" ? body.segment : "all";
  const segment = VALID_SEGMENTS.includes(segmentParam as BroadcastSegment)
    ? (segmentParam as BroadcastSegment)
    : "all";

  const result = await sendNewsletter({
    title,
    body: text,
    url,
    segment,
    sentBy: admin.id,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ entry: result });
}
