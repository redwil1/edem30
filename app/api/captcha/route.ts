import { NextRequest, NextResponse } from "next/server";

import { generateCaptcha } from "@/lib/captcha";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/security";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const limit = rateLimit(`captcha:${ip}`, { limit: 30, windowMs: 60_000 });

  if (!limit.allowed) {
    return NextResponse.json({ error: "Слишком много запросов" }, { status: 429 });
  }

  const captcha = generateCaptcha();

  return NextResponse.json(captcha, {
    headers: { "Cache-Control": "no-store" },
  });
}
