import { NextRequest, NextResponse } from "next/server";

import { exchangeOkCode } from "@/lib/oauth/ok";
import { loginWithOAuthProfile } from "@/lib/oauthAccounts";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const savedState = req.cookies.get("oauth_state")?.value;

  if (!code || !state || !savedState || state !== savedState) {
    return NextResponse.redirect(new URL("/login?oauthError=1", req.nextUrl.origin));
  }

  const redirectUri = `${req.nextUrl.origin}/api/auth/oauth/ok/callback`;

  const profile = await exchangeOkCode(code, redirectUri);

  if (!profile) {
    return NextResponse.redirect(new URL("/login?oauthError=1", req.nextUrl.origin));
  }

  await loginWithOAuthProfile({
    provider: "ok",
    providerId: profile.providerId,
    name: profile.name,
    avatarUrl: profile.avatarUrl,
  });

  const res = NextResponse.redirect(new URL("/", req.nextUrl.origin));
  res.cookies.delete("oauth_state");

  return res;
}
