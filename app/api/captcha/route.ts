import { NextResponse } from "next/server";

import { generateCaptcha } from "@/lib/captcha";

export const runtime = "nodejs";

export async function GET() {
  const captcha = generateCaptcha();

  return NextResponse.json(captcha, {
    headers: { "Cache-Control": "no-store" },
  });
}
