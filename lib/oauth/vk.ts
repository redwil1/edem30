import "server-only";

const VK_API_VERSION = "5.199";

export function isVkConfigured(): boolean {
  return Boolean(process.env.VK_CLIENT_ID && process.env.VK_CLIENT_SECRET);
}

export function getVkAuthorizeUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.VK_CLIENT_ID!,
    redirect_uri: redirectUri,
    display: "page",
    response_type: "code",
    v: VK_API_VERSION,
    state,
  });

  return `https://oauth.vk.com/authorize?${params.toString()}`;
}

type VkTokenResponse = {
  access_token?: string;
  user_id?: number;
  error?: string;
  error_description?: string;
};

type VkUser = {
  id: number;
  first_name: string;
  last_name: string;
  photo_200?: string;
};

export type VkProfile = {
  providerId: string;
  name: string;
  avatarUrl: string | null;
};

export async function exchangeVkCode(
  code: string,
  redirectUri: string
): Promise<VkProfile | null> {
  const tokenParams = new URLSearchParams({
    client_id: process.env.VK_CLIENT_ID!,
    client_secret: process.env.VK_CLIENT_SECRET!,
    redirect_uri: redirectUri,
    code,
  });

  const tokenRes = await fetch(`https://oauth.vk.com/access_token?${tokenParams.toString()}`);
  const tokenData: VkTokenResponse = await tokenRes.json().catch(() => ({}));

  if (!tokenData.access_token || !tokenData.user_id) return null;

  const userParams = new URLSearchParams({
    user_ids: String(tokenData.user_id),
    fields: "photo_200",
    access_token: tokenData.access_token,
    v: VK_API_VERSION,
  });

  const userRes = await fetch(`https://api.vk.com/method/users.get?${userParams.toString()}`);
  const userData: { response?: VkUser[] } = await userRes.json().catch(() => ({}));

  const vkUser = userData.response?.[0];
  if (!vkUser) return null;

  return {
    providerId: String(vkUser.id),
    name: `${vkUser.first_name} ${vkUser.last_name}`.trim(),
    avatarUrl: vkUser.photo_200 ?? null,
  };
}
