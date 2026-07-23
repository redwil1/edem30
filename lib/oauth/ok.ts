import "server-only";

import crypto from "crypto";

export function isOkConfigured(): boolean {
  return Boolean(
    process.env.OK_CLIENT_ID && process.env.OK_CLIENT_SECRET && process.env.OK_PUBLIC_KEY
  );
}

export function getOkAuthorizeUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.OK_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "VALUABLE_ACCESS",
    layout: "w",
    state,
  });

  return `https://connect.ok.ru/oauth/authorize?${params.toString()}`;
}

type OkTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

type OkUser = {
  uid: string;
  first_name: string;
  last_name: string;
  pic_190x190?: string;
};

export type OkProfile = {
  providerId: string;
  name: string;
  avatarUrl: string | null;
};

function md5(input: string): string {
  return crypto.createHash("md5").update(input).digest("hex");
}

export async function exchangeOkCode(
  code: string,
  redirectUri: string
): Promise<OkProfile | null> {
  const tokenRes = await fetch("https://api.ok.ru/oauth/token.do", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.OK_CLIENT_ID!,
      client_secret: process.env.OK_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const tokenData: OkTokenResponse = await tokenRes.json().catch(() => ({}));

  if (!tokenData.access_token) return null;

  const accessToken = tokenData.access_token;
  const publicKey = process.env.OK_PUBLIC_KEY!;
  const secretKey = process.env.OK_CLIENT_SECRET!;

  // Подпись метода REST API OK: sig = md5("application_key=X..." отсортированные
  // параметры без разделителей + секретный сессионный ключ), где секретный
  // сессионный ключ = md5(access_token + secret_key приложения).
  const methodParams: Record<string, string> = {
    application_key: publicKey,
    method: "users.getCurrentUser",
    format: "json",
    fields: "uid,first_name,last_name,pic_190x190",
  };

  const sortedParamString = Object.keys(methodParams)
    .sort()
    .map((key) => `${key}=${methodParams[key]}`)
    .join("");

  const sessionSecretKey = md5(`${accessToken}${secretKey}`);
  const sig = md5(`${sortedParamString}${sessionSecretKey}`);

  const apiParams = new URLSearchParams({
    ...methodParams,
    access_token: accessToken,
    sig,
  });

  const userRes = await fetch(`https://api.ok.ru/fb.do?${apiParams.toString()}`);
  const okUser: OkUser | { error_code?: number } = await userRes.json().catch(() => ({}));

  if (!("uid" in okUser)) return null;

  return {
    providerId: okUser.uid,
    name: `${okUser.first_name} ${okUser.last_name}`.trim(),
    avatarUrl: okUser.pic_190x190 ?? null,
  };
}
