import "server-only";

// ОК и VK ID теперь один сервис (OK.ru официально перевёл OAuth на VK ID) —
// поэтому это единственная точка проверки для обеих кнопок в виджете.
// Домен и форма запроса взяты из исходников @vkid/sdk (auth/auth.js
// userInfo()) — id.vk.ru, POST с access_token в теле и client_id в query.
const VK_APP_ID = process.env.VK_APP_ID ?? "54691633";
const VK_DOMAIN = "id.vk.ru";

export type VkProfile = {
  externalId: string;
  name: string;
  avatarUrl: string | null;
};

type VkUserInfoResponse = {
  error?: string;
  user?: {
    user_id?: string;
    first_name?: string;
    last_name?: string;
    avatar?: string;
  };
};

export async function fetchVkUserInfo(accessToken: string): Promise<VkProfile | null> {
  try {
    const res = await fetch(
      `https://${VK_DOMAIN}/oauth2/user_info?client_id=${VK_APP_ID}`,
      {
        method: "POST",
        body: new URLSearchParams({ access_token: accessToken }),
      }
    );

    const data = (await res.json()) as VkUserInfoResponse;
    const userId = data.user?.user_id;

    if (data.error || !userId) return null;

    const user = data.user!;
    const name = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();

    return {
      externalId: userId,
      name: name || "Пользователь VK",
      avatarUrl: user.avatar ?? null,
    };
  } catch {
    return null;
  }
}
