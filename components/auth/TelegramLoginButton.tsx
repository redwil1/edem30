"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type TelegramUser = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
};

declare global {
  interface Window {
    onTelegramAuth?: (user: TelegramUser) => void;
  }
}

export default function TelegramLoginButton() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
    if (!botUsername || !containerRef.current) return;

    window.onTelegramAuth = async (user: TelegramUser) => {
      const res = await fetch("/api/auth/oauth/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(user),
      });

      if (res.ok) {
        router.push("/");
        router.refresh();
      }
    };

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "14");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    script.setAttribute("data-request-access", "write");

    containerRef.current.appendChild(script);

    return () => {
      delete window.onTelegramAuth;
    };
  }, [router]);

  if (!process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME) return null;

  return <div ref={containerRef} className="flex justify-center" />;
}
