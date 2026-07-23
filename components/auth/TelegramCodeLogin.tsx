"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";

import PhoneInput from "@/components/PhoneInput";

export default function TelegramCodeLogin() {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  async function requestCode(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/telegram-code/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error || "Не удалось отправить код");
        return;
      }

      setInfo("Код отправлен в Telegram — проверьте чат с ботом.");
      setStep("code");
    } catch {
      setError("Не удалось подключиться к серверу");
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/telegram-code/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error || "Не удалось войти");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Не удалось подключиться к серверу");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 bg-[#171726] hover:bg-[#222233] border border-white/5 transition rounded-2xl py-3.5 font-medium text-sm"
      >
        <Send size={16} className="text-[#2AABEE]" />
        Войти по коду в Telegram
      </button>
    );
  }

  return (
    <form
      onSubmit={step === "phone" ? requestCode : verifyCode}
      className="bg-[#171726] border border-white/5 rounded-2xl p-4 space-y-3"
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        <Send size={16} className="text-[#2AABEE]" />
        Вход по коду в Telegram
      </div>

      {step === "phone" ? (
        <PhoneInput value={phone} onChange={setPhone} />
      ) : (
        <>
          <div className="text-xs text-gray-500">{phone}</div>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="Код из Telegram"
            inputMode="numeric"
            autoFocus
            className="w-full bg-[#0f0f18] border border-white/10 focus:border-violet-500 rounded-xl p-3.5 outline-none transition"
          />
        </>
      )}

      {info && step === "code" && <p className="text-green-400 text-xs">{info}</p>}
      {error && <p className="text-red-400 text-xs">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-60 transition rounded-xl py-3 font-bold text-sm"
      >
        {loading ? "Секунду..." : step === "phone" ? "Получить код" : "Войти"}
      </button>

      {step === "code" && (
        <button
          type="button"
          onClick={() => {
            setStep("phone");
            setCode("");
            setError("");
          }}
          className="w-full text-xs text-gray-500 hover:text-white transition"
        >
          Изменить номер
        </button>
      )}
    </form>
  );
}
