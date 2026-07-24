"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Mail } from "lucide-react";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const visible = local.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(local.length - 2, 1))}@${domain}`;
}

export default function EmailSettings() {
  const [savedEmail, setSavedEmail] = useState<string | null | undefined>(undefined);
  const [editing, setEditing] = useState(false);

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeRequested, setCodeRequested] = useState(false);
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/profile/email", { cache: "no-store" });
    const data = await res.json().catch(() => null);
    setSavedEmail(data?.email ?? null);
  }

  useEffect(() => {
    load();
  }, []);

  const emailValid = EMAIL_RE.test(email);

  function startEditing() {
    setEditing(true);
    setEmail("");
    setCode("");
    setCodeRequested(false);
    setError("");
  }

  async function requestCode() {
    setError("");
    setSending(true);

    try {
      const res = await fetch("/api/profile/email/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error || "Не удалось отправить код");
        return;
      }

      setCodeRequested(true);
    } catch {
      setError("Не удалось подключиться к серверу");
    } finally {
      setSending(false);
    }
  }

  async function confirmCode() {
    setError("");
    setConfirming(true);

    try {
      const res = await fetch("/api/profile/email/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error || "Не удалось подтвердить код");
        return;
      }

      setSavedEmail(data.email);
      setEditing(false);
    } catch {
      setError("Не удалось подключиться к серверу");
    } finally {
      setConfirming(false);
    }
  }

  if (savedEmail === undefined) return null;

  return (
    <div className="bg-[#12121c] border border-white/5 rounded-3xl p-4 sm:p-6 mt-6">
      <div className="flex items-center gap-2 font-bold mb-1">
        <Mail size={16} className="text-violet-400" />
        Почта
      </div>

      <p className="text-sm text-gray-500 mb-4">
        Нужна для восстановления пароля.
      </p>

      {!editing && savedEmail && (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-green-400">
            <CheckCircle2 size={16} />
            {maskEmail(savedEmail)}
          </div>

          <button
            type="button"
            onClick={startEditing}
            className="text-violet-400 hover:text-violet-300 text-sm font-medium"
          >
            Изменить
          </button>
        </div>
      )}

      {!editing && !savedEmail && (
        <button
          type="button"
          onClick={startEditing}
          className="w-full bg-[#222233] hover:bg-[#2a2a40] transition rounded-xl py-3 text-sm font-medium"
        >
          Добавить почту
        </button>
      )}

      {editing && (
        <div className="space-y-3">
          <input
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setCodeRequested(false);
              setCode("");
            }}
            type="email"
            placeholder="Почта"
            className="w-full bg-[#0f0f18] border border-white/10 focus:border-violet-500 rounded-xl p-3.5 outline-none transition"
          />

          {!codeRequested ? (
            <button
              type="button"
              onClick={requestCode}
              disabled={!emailValid || sending}
              className="w-full bg-[#222233] hover:bg-[#2a2a40] disabled:opacity-50 transition rounded-xl py-3 text-sm font-medium"
            >
              {sending ? "Отправляем..." : "Отправить код на почту"}
            </button>
          ) : (
            <>
              <div className="text-xs text-green-400">
                Код отправлен на почту — введите его ниже
              </div>

              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="Код из письма"
                inputMode="numeric"
                className="w-full bg-[#0f0f18] border border-white/10 focus:border-violet-500 rounded-xl p-3.5 outline-none transition"
              />

              <button
                type="button"
                onClick={confirmCode}
                disabled={!code || confirming}
                className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50 transition rounded-xl py-3 text-sm font-bold"
              >
                {confirming ? "Проверяем..." : "Подтвердить"}
              </button>
            </>
          )}

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <button
            type="button"
            onClick={() => setEditing(false)}
            className="w-full text-gray-500 hover:text-gray-400 text-xs"
          >
            Отмена
          </button>
        </div>
      )}
    </div>
  );
}
