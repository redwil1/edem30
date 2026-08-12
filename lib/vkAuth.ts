import "server-only";

// ОК и VK ID теперь один сервис (OK.ru официально перевёл OAuth на VK ID) —
// поэтому это единственная точка проверки для обеих кнопок в виджете.
const VK_APP_ID = process.env.VK_APP_ID ?? "54691633";

export type VkProfile = {
  externalId: string;
  name: string;
  avatarUrl: string | null;
};

type VkUserInfoResponse = {
  user?: {
    user_id?: string | number;
    first_name?: string;
    last_name?: string;
    avatar?: string;
  };
};

export async function fetchVkUserInfo(accessToken: string): Promise<VkProfile | null> {
  try {
    const res = await fetch("https://id.vk.com/oauth2/user_info", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: VK_APP_ID, access_token: accessToken }),
    });

    if (!res.ok) return null;

    const data = (await res.json()) as VkUserInfoResponse;
    const user = data.user;

    if (!user?.user_id) return null;

    const name = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();

    return {
      externalId: String(user.user_id),
      name: name || "Пользователь VK",
      avatarUrl: user.avatar ?? null,
    };
  } catch {
    return null;
  }
}
