import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

import { getVkAuthorizeUrl, isVkConfigured } from "@/lib/oauth/vk";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!isVkConfigured()) {
    return NextResponse.redirect(new URL("/login?oauthError=notconfigured", req.nextUrl.origin));
  }

  const redirectUri = `${req.nextUrl.origin}/api/auth/oauth/vk/callback`;
  const state = crypto.randomBytes(16).toString("hex");

  const res = NextResponse.redirect(getVkAuthorizeUrl(redirectUri, state));

  res.cookies.set("oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  return res;
}
