"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth/AuthProvider";
import PhoneInput from "@/components/PhoneInput";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { refresh } = useAuth();

  const [step, setStep] = useState<"phone" | "reset">("phone");
  const [phone, setPhone] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");

  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function requestCode(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (phone.replace(/\D/g, "").length !== 11) {
      setError("Номер телефона должен содержать 11 цифр");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Не удалось отправить код");
        return;
      }

      setMaskedEmail(data.maskedEmail);
      setStep("reset");
    } catch {
      setError("Не удалось подключиться к серверу");
    } finally {
      setLoading(false);
    }
  }

  async function confirmReset(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (newPassword.length < 7) {
      setError("Пароль должен быть не короче 7 символов");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Не удалось сменить пароль");
        return;
      }

      await refresh();
      router.push("/");
      router.refresh();
    } catch {
      setError("Не удалось подключиться к серверу");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0b0b13] text-white flex items-center">
      <div className="max-w-md mx-auto w-full px-5 py-16">
        <Link href="/login" className="text-violet-400 text-sm inline-block mb-8">
          ← Ко входу
        </Link>

        <h1 className="text-3xl font-bold mb-2">Восстановление пароля</h1>

        {step === "phone" ? (
          <>
            <p className="text-gray-400 mb-8">
              Введите номер телефона, указанный при регистрации. Если к нему
              привязана почта — пришлём код туда.
            </p>

            <form onSubmit={requestCode} className="space-y-4">
              <PhoneInput value={phone} onChange={setPhone} />

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-60 transition rounded-2xl py-4 font-bold"
              >
                {loading ? "Секунду..." : "Отправить код"}
              </button>
            </form>
          </>
        ) : (
          <>
            <p className="text-gray-400 mb-8">
              Код отправлен на {maskedEmail}. Введите его и новый пароль.
            </p>

            <form onSubmit={confirmReset} className="space-y-4">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="Код из письма"
                inputMode="numeric"
                className="w-full bg-[#171726] border border-white/5 focus:border-violet-500 rounded-2xl p-4 outline-none transition"
              />

              <input
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                type="password"
                placeholder="Новый пароль"
                className="w-full bg-[#171726] border border-white/5 focus:border-violet-500 rounded-2xl p-4 outline-none transition"
              />

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-60 transition rounded-2xl py-4 font-bold"
              >
                {loading ? "Секунду..." : "Сменить пароль"}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
