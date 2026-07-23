import "server-only";

export function isVkConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_VK_APP_ID);
}

type VkUserInfoResponse = {
  user?: {
    user_id: string;
    first_name: string;
    last_name: string;
    avatar?: string;
  };
  error?: string;
  error_description?: string;
};

export type VkProfile = {
  providerId: string;
  name: string;
  avatarUrl: string | null;
};

/** Проверяет access_token, полученный от VK ID SDK на клиенте, и возвращает профиль. */
export async function getVkUserInfo(accessToken: string): Promise<VkProfile | null> {
  const appId = process.env.NEXT_PUBLIC_VK_APP_ID;
  if (!appId) return null;

  const res = await fetch("https://id.vk.com/oauth2/user_info", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: appId,
      access_token: accessToken,
    }),
  });

  const data: VkUserInfoResponse = await res.json().catch(() => ({}));

  if (!data.user) return null;

  return {
    providerId: data.user.user_id,
    name: `${data.user.first_name} ${data.user.last_name}`.trim(),
    avatarUrl: data.user.avatar ?? null,
  };
}
