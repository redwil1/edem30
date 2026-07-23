import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

import { getOkAuthorizeUrl, isOkConfigured } from "@/lib/oauth/ok";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!isOkConfigured()) {
    return NextResponse.redirect(new URL("/login?oauthError=notconfigured", req.nextUrl.origin));
  }

  const redirectUri = `${req.nextUrl.origin}/api/auth/oauth/ok/callback`;
  const state = crypto.randomBytes(16).toString("hex");

  const res = NextResponse.redirect(getOkAuthorizeUrl(redirectUri, state));

  res.cookies.set("oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  return res;
}
