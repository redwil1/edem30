"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type VkExchangeResult = {
  access_token: string;
};

type VkChainable = {
  on: (event: unknown, handler: (payload: unknown) => void) => VkChainable;
};

type VkIdSdk = {
  Config: {
    init: (options: {
      app: number;
      redirectUrl: string;
      responseMode: unknown;
      source: unknown;
      scope: string;
    }) => void;
  };
  ConfigResponseMode: { Callback: unknown };
  ConfigSource: { LOWCODE: unknown };
  WidgetEvents: { ERROR: unknown };
  OneTapInternalEvents: { LOGIN_SUCCESS: unknown };
  OneTap: new () => {
    render: (options: {
      container: HTMLElement;
      showAlternativeLogin: boolean;
    }) => VkChainable;
  };
  Auth: {
    exchangeCode: (code: string, deviceId: string) => Promise<VkExchangeResult>;
  };
};

declare global {
  interface Window {
    VKIDSDK?: VkIdSdk;
  }
}

export default function VkIdOneTap() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const initedRef = useRef(false);

  useEffect(() => {
    const appId = process.env.NEXT_PUBLIC_VK_APP_ID;
    if (!appId || !containerRef.current || initedRef.current) return;

    function init() {
      const VKID = window.VKIDSDK;
      if (!VKID || !containerRef.current) return;

      initedRef.current = true;

      VKID.Config.init({
        app: Number(appId),
        redirectUrl: typeof window !== "undefined" ? window.location.origin + "/" : "",
        responseMode: VKID.ConfigResponseMode.Callback,
        source: VKID.ConfigSource.LOWCODE,
        scope: "",
      });

      const oneTap = new VKID.OneTap();

      oneTap
        .render({
          container: containerRef.current,
          showAlternativeLogin: false,
        })
        .on(VKID.WidgetEvents.ERROR, () => {})
        .on(VKID.OneTapInternalEvents.LOGIN_SUCCESS, (payload: unknown) => {
          const { code, device_id: deviceId } = payload as {
            code: string;
            device_id: string;
          };

          VKID.Auth.exchangeCode(code, deviceId)
            .then(async (data) => {
              const res = await fetch("/api/auth/oauth/vk", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ accessToken: data.access_token }),
              });

              if (res.ok) {
                router.push("/");
                router.refresh();
              }
            })
            .catch(() => {});
        });
    }

    if (window.VKIDSDK) {
      init();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://unpkg.com/@vkid/sdk@<3.0.0/dist-sdk/umd/index.js";
    script.async = true;
    script.onload = init;
    document.body.appendChild(script);
  }, [router]);

  if (!process.env.NEXT_PUBLIC_VK_APP_ID) return null;

  return <div ref={containerRef} className="flex justify-center" />;
}
