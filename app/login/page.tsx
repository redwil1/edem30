"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import { useAuth } from "@/components/auth/AuthProvider";
import PhoneInput from "@/components/PhoneInput";
import VkLoginButton from "@/components/auth/VkLoginButton";
import { subscribeToPush } from "@/lib/pushSubscribeClient";

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

  const [mode, setMode] = useState<"login" | "register">("register");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const [captchaQuestion, setCaptchaQuestion] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [pushConsent, setPushConsent] = useState(false);
  const [dataConsent, setDataConsent] = useState(false);

  const [phoneCode, setPhoneCode] = useState("");
  const [phoneCodeRequested, setPhoneCodeRequested] = useState(false);
  const [sendingPhoneCode, setSendingPhoneCode] = useState(false);
  const [phoneCodeError, setPhoneCodeError] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function onPhoneChange(value: string) {
    setPhone(value);
    setPhoneCodeRequested(false);
    setPhoneCode("");
    setPhoneCodeError("");
  }

  async function requestPhoneVerifyCode(): Promise<boolean> {
    setPhoneCodeError("");

    if (phone.replace(/\D/g, "").length !== 11) {
      setPhoneCodeError("Номер телефона должен содержать 11 цифр");
      return false;
    }

    setSendingPhoneCode(true);

    try {
      const res = await fetch("/api/auth/phone-verify/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setPhoneCodeError(data?.error || "Не удалось позвонить");
        return false;
      }

      setPhoneCodeRequested(true);
      return true;
    } catch {
      setPhoneCodeError("Не удалось подключиться к серверу");
      return false;
    } finally {
      setSendingPhoneCode(false);
    }
  }

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

      if (!dataConsent) {
        setError("Подтвердите согласие на обработку персональных данных, чтобы продолжить");
        return;
      }

      if (!phoneCodeRequested) {
        await requestPhoneVerifyCode();
        return;
      }

      if (!phoneCode) {
        setPhoneCodeError("Введите код со звонка");
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
                phoneCode,
                password,
                captchaToken,
                captchaAnswer: Number(captchaAnswer),
                pushConsent,
                dataConsent,
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

        <VkLoginButton redirect={redirectTo} />

        <div className="flex items-center gap-3 my-6">
          <div className="h-px bg-white/10 flex-1" />
          <span className="text-xs text-gray-500">или по номеру телефона</span>
          <div className="h-px bg-white/10 flex-1" />
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === "register" && (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ваше имя"
              className="w-full bg-[#171726] border border-white/5 focus:border-violet-500 rounded-2xl p-4 outline-none transition"
            />
          )}

          <PhoneInput value={phone} onChange={mode === "register" ? onPhoneChange : setPhone} />

          {mode === "register" && (
            <div className="bg-[#171726] border border-white/5 rounded-2xl p-4 space-y-3">
              {!phoneCodeRequested ? (
                <p className="text-xs text-gray-500 leading-relaxed">
                  Номер нужно подтвердить настоящим звонком — при нажатии
                  «Зарегистрироваться» вам позвонят, и последние 4 цифры
                  номера, с которого поступит звонок, будут кодом
                  подтверждения.
                </p>
              ) : (
                <>
                  <div className="text-xs text-green-400">
                    Вам звонят — введите последние 4 цифры номера, с которого
                    поступил звонок
                  </div>
                  <input
                    value={phoneCode}
                    onChange={(e) => setPhoneCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="Код со звонка"
                    inputMode="numeric"
                    autoFocus
                    className="w-full bg-[#0f0f18] border border-white/10 focus:border-violet-500 rounded-xl p-3.5 outline-none transition"
                  />

                  <button
                    type="button"
                    onClick={async () => {
                      setPhoneCode("");
                      await requestPhoneVerifyCode();
                    }}
                    disabled={sendingPhoneCode}
                    className="text-xs text-violet-400 hover:text-violet-300 disabled:opacity-60 transition"
                  >
                    {sendingPhoneCode ? "Звоним..." : "Позвонить ещё раз"}
                  </button>
                </>
              )}

              {phoneCodeError && <p className="text-red-400 text-xs">{phoneCodeError}</p>}
            </div>
          )}

          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="Пароль"
            className="w-full bg-[#171726] border border-white/5 focus:border-violet-500 rounded-2xl p-4 outline-none transition"
          />

          {mode === "login" && (
            <div className="text-right -mt-1">
              <Link href="/forgot-password" className="text-violet-400 text-sm hover:text-violet-300">
                Забыли пароль?
              </Link>
            </div>
          )}

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
                checked={dataConsent}
                onChange={(e) => setDataConsent(e.target.checked)}
                className="mt-0.5 w-4 h-4 shrink-0 accent-violet-600"
              />
              <span>
                Даю согласие на{" "}
                <Link href="/privacy" target="_blank" className="text-violet-400 hover:text-violet-300 underline">
                  обработку персональных данных
                </Link>{" "}
                и принимаю{" "}
                <Link href="/terms" target="_blank" className="text-violet-400 hover:text-violet-300 underline">
                  пользовательское соглашение
                </Link>
              </span>
            </label>
          )}

          {mode === "register" && (
            <label className="flex items-start gap-3 text-sm text-gray-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={pushConsent}
                onChange={(e) => setPushConsent(e.target.checked)}
                className="mt-0.5 w-4 h-4 shrink-0 accent-violet-600"
              />
              <span>
                Согласен(на) получать push-уведомления о новых сообщениях,
                заказах и статусе поездок{" "}
                <span className="text-gray-600">(необязательно)</span>
              </span>
            </label>
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading || sendingPhoneCode}
            className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-60 transition rounded-2xl py-4 font-bold"
          >
            {sendingPhoneCode
              ? "Звоним..."
              : loading
              ? "Секунду..."
              : mode === "register"
              ? !phoneCodeRequested
                ? "Позвонить для подтверждения"
                : "Зарегистрироваться"
              : "Войти"}
          </button>
        </form>

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
