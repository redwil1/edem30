"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import { useAuth } from "@/components/auth/AuthProvider";
import PhoneInput from "@/components/PhoneInput";
import { subscribeToPush } from "@/lib/pushSubscribeClient";
import TelegramLoginButton from "@/components/auth/TelegramLoginButton";
import VkIdOneTap from "@/components/auth/VkIdOneTap";

function isSafeRedirect(path: string) {
  return /^\/(?!\/|\\)/.test(path);
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refresh } = useAuth();

  const redirectParam = searchParams.get("redirect") || "/";
  const redirectTo = isSafeRedirect(redirectParam) ? redirectParam : "/";

  const roleParam = searchParams.get("role");
  const requestedRole = roleParam === "driver" ? "driver" : roleParam === "passenger" ? "passenger" : null;

  const oauthError = searchParams.get("oauthError");
  const oauthErrorMessage =
    oauthError === "notconfigured"
      ? "Этот способ входа пока недоступен"
      : oauthError
      ? "Не удалось войти. Попробуйте ещё раз"
      : "";

  const [mode, setMode] = useState<"login" | "register">("register");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const [captchaQuestion, setCaptchaQuestion] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [pushConsent, setPushConsent] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadCaptcha() {
    const res = await fetch("/api/captcha", { cache: "no-store" });
    const data = await res.json();

    setCaptchaQuestion(data.question);
    setCaptchaToken(data.token);
    setCaptchaAnswer("");
  }

  useEffect(() => {
    if (mode === "register") loadCaptcha();
  }, [mode]);

  async function submit(e: FormEvent) {
    e.preventDefault();

    setError("");

    if (mode === "register") {
      if (phone.replace(/\D/g, "").length !== 11) {
        setError("Номер телефона должен содержать 11 цифр");
        return;
      }

      if (password.length < 7) {
        setError("Пароль должен быть не короче 7 символов");
        return;
      }

      if (!pushConsent) {
        setError("Подтвердите согласие на push-уведомления, чтобы продолжить");
        return;
      }
    }

    setLoading(true);

    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "register"
            ? {
                name,
                phone,
                password,
                captchaToken,
                captchaAnswer: Number(captchaAnswer),
                pushConsent,
              }
            : { phone, password }
        ),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Что-то пошло не так");
        setLoading(false);
        if (mode === "register") await loadCaptcha();
        return;
      }

      if (requestedRole) {
        await fetch("/api/auth/role", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: requestedRole }),
        });
      }

      if (mode === "register" && pushConsent) {
        subscribeToPush();
      }

      await refresh();
      router.push(redirectTo);
      router.refresh();
    } catch {
      setError("Не удалось подключиться к серверу");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0b0b13] text-white flex items-center">
      <div className="max-w-md mx-auto w-full px-5 py-16">
        <Link href="/" className="text-violet-400 text-sm inline-block mb-8">
          ← На главную
        </Link>

        <div className="flex bg-[#171726] rounded-2xl p-1 mb-8">
          <button
            type="button"
            onClick={() => setMode("register")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition ${
              mode === "register"
                ? "bg-violet-600 text-white"
                : "text-gray-400"
            }`}
          >
            Регистрация
          </button>

          <button
            type="button"
            onClick={() => setMode("login")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition ${
              mode === "login" ? "bg-violet-600 text-white" : "text-gray-400"
            }`}
          >
            Вход
          </button>
        </div>

        <h1 className="text-3xl font-bold mb-2">
          {mode === "register" ? "Создать аккаунт" : "С возвращением"}
        </h1>

        <p className="text-gray-400 mb-8">
          {mode === "register"
            ? "Регистрация займёт меньше минуты"
            : "Войдите по номеру телефона и паролю"}
        </p>

        <form onSubmit={submit} className="space-y-4">
          {mode === "register" && (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ваше имя"
              className="w-full bg-[#171726] border border-white/5 focus:border-violet-500 rounded-2xl p-4 outline-none transition"
            />
          )}

          <PhoneInput value={phone} onChange={setPhone} />

          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="Пароль"
            className="w-full bg-[#171726] border border-white/5 focus:border-violet-500 rounded-2xl p-4 outline-none transition"
          />

          {mode === "register" && (
            <div className="flex items-center gap-3">
              <div className="bg-[#171726] border border-white/5 rounded-2xl px-4 py-4 text-sm text-gray-400 whitespace-nowrap">
                {captchaQuestion || "…"} =
              </div>

              <input
                value={captchaAnswer}
                onChange={(e) => setCaptchaAnswer(e.target.value)}
                type="text"
                inputMode="numeric"
                placeholder="?"
                className="w-full bg-[#171726] border border-white/5 focus:border-violet-500 rounded-2xl p-4 outline-none transition"
              />
            </div>
          )}

          {mode === "register" && (
            <label className="flex items-start gap-3 text-sm text-gray-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={pushConsent}
                onChange={(e) => setPushConsent(e.target.checked)}
                className="mt-0.5 w-4 h-4 shrink-0 accent-violet-600"
              />
              Согласен(на) получать push-уведомления о новых сообщениях,
              заказах и статусе поездок
            </label>
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-60 transition rounded-2xl py-4 font-bold"
          >
            {loading
              ? "Секунду..."
              : mode === "register"
              ? "Зарегистрироваться"
              : "Войти"}
          </button>
        </form>

        {oauthErrorMessage && (
          <p className="text-red-400 text-sm text-center mt-4">{oauthErrorMessage}</p>
        )}

        <div className="flex items-center gap-3 my-6">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-xs text-gray-500">или через</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <div className="flex flex-col gap-3">
          <VkIdOneTap />

          <a
            href="/api/auth/oauth/ok/start"
            className="w-full flex items-center justify-center gap-2 bg-[#171726] hover:bg-[#222233] border border-white/5 transition rounded-2xl py-3.5 font-medium text-sm"
          >
            <span className="text-[#EE8208] font-bold">OK</span>
            Войти через Одноклассники
          </a>

          <TelegramLoginButton />
        </div>

        <p className="text-gray-500 text-sm mt-8 leading-6">
          Продолжая, вы принимаете условия использования и соглашаетесь на
          обработку персональных данных.
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
