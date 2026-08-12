"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";

const VK_APP_ID = Number(process.env.NEXT_PUBLIC_VK_APP_ID ?? "54691633");

type VkidWidgetHandle = {
  on: (event: unknown, handler: (payload: unknown) => void) => VkidWidgetHandle;
};

type VkidSdk = {
  Config: {
    init: (config: {
      app: number;
      redirectUrl: string;
      responseMode: unknown;
      source: unknown;
      scope: string;
    }) => void;
  };
  ConfigResponseMode: { Callback: unknown };
  ConfigSource: { LOWCODE: unknown };
  OAuthList: new () => {
    render: (options: { container: HTMLElement; oauthList: string[] }) => VkidWidgetHandle;
  };
  WidgetEvents: { ERROR: unknown };
  OAuthListInternalEvents: { LOGIN_SUCCESS: unknown };
  Auth: {
    exchangeCode: (
      code: string,
      deviceId: string
    ) => Promise<{ access_token?: string }>;
  };
};

declare global {
  interface Window {
    VKIDSDK?: VkidSdk;
  }
}

type Props = {
  redirect?: string;
};

export default function VkLoginButton({ redirect = "/" }: Props) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!sdkReady || !containerRef.current) return;

    const VKID = window.VKIDSDK;
    if (!VKID) return;

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
        oauthList: ["vkid", "ok"],
      })
      .on(VKID.WidgetEvents.ERROR, () => {
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
  }, [sdkReady, redirect, router]);

  return (
    <div>
      <Script
        src="https://unpkg.com/@vkid/sdk@<3.0.0/dist-sdk/umd/index.js"
        strategy="afterInteractive"
        onLoad={() => setSdkReady(true)}
      />

      <div ref={containerRef} />

      {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
    </div>
  );
}
