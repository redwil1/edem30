"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const VK_APP_ID = Number(process.env.NEXT_PUBLIC_VK_APP_ID ?? "54691633");

type Props = {
  redirect?: string;
};

export default function VkLoginButton({ redirect = "/" }: Props) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;

    let cancelled = false;

    import("@vkid/sdk")
      .then((VKID) => {
        if (cancelled || !containerRef.current) return;

        VKID.Config.init({
          app: VK_APP_ID,
          redirectUrl: window.location.origin + "/",
          responseMode: VKID.ConfigResponseMode.Callback,
          source: VKID.ConfigSource.LOWCODE,
          scope: "",
        });

        const oAuth = new VKID.OAuthList();

        oAuth
          .render({
            container: containerRef.current,
            oauthList: [VKID.OAuthName.VK, VKID.OAuthName.OK],
          })
          .on(VKID.WidgetEvents.ERROR, (payload: unknown) => {
            console.error("[VK ID] widget error", payload);
            setError("Не удалось загрузить вход через VK/ОК");
          })
          .on(VKID.OAuthListInternalEvents.LOGIN_SUCCESS, (rawPayload: unknown) => {
            const payload = rawPayload as { code?: string; device_id?: string };
            const { code, device_id } = payload;

            if (!code || !device_id) return;

            VKID.Auth.exchangeCode(code, device_id)
              .then(async (authData) => {
                if (!authData?.access_token) {
                  setError("Не удалось войти. Попробуйте ещё раз.");
                  return;
                }

                const res = await fetch("/api/auth/vk", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ accessToken: authData.access_token }),
                });

                if (!res.ok) {
                  const data = await res.json().catch(() => null);
                  setError(data?.error || "Не удалось войти");
                  return;
                }

                router.push(redirect);
                router.refresh();
              })
              .catch(() => setError("Не удалось войти. Попробуйте ещё раз."));
          });

        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("[VK ID] failed to load SDK", err);
        setError("Не удалось загрузить модуль VK ID");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [redirect, router]);

  return (
    <div>
      <div ref={containerRef} />

      {loading && !error && (
        <div className="text-xs text-gray-500">Загружаем вход через VK...</div>
      )}

      {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
    </div>
  );
}
