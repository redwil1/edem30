import { NextRequest, NextResponse } from "next/server";

import { exchangeVkCode } from "@/lib/oauth/vk";
import { loginWithOAuthProfile } from "@/lib/oauthAccounts";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const savedState = req.cookies.get("oauth_state")?.value;

  if (!code || !state || !savedState || state !== savedState) {
    return NextResponse.redirect(new URL("/login?oauthError=1", req.nextUrl.origin));
  }

  const redirectUri = `${req.nextUrl.origin}/api/auth/oauth/vk/callback`;

  const profile = await exchangeVkCode(code, redirectUri);

  if (!profile) {
    return NextResponse.redirect(new URL("/login?oauthError=1", req.nextUrl.origin));
  }

  await loginWithOAuthProfile({
    provider: "vk",
    providerId: profile.providerId,
    name: profile.name,
    avatarUrl: profile.avatarUrl,
  });

  const res = NextResponse.redirect(new URL("/", req.nextUrl.origin));
  res.cookies.delete("oauth_state");

  return res;
}
