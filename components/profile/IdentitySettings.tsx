"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import { GENDERS } from "@/lib/avatarPresets";

export default function IdentitySettings() {
  const { user, refresh } = useAuth();
  const [gender, setGender] = useState(user?.gender ?? "");
  const [name, setName] = useState(user?.name ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  if (!user) return null;

  async function save(patch: { gender?: string | null; name?: string }) {
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/profile/identity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error || "Не удалось сохранить");
        return;
      }

      await refresh();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Не удалось подключиться к серверу");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-[#12121c] border border-white/5 rounded-3xl p-4 sm:p-6 mt-6">
      <div className="font-display font-bold mb-4">Профиль</div>

      <div className="mb-5">
        <div className="text-xs text-gray-500 mb-2">Имя</div>

        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            disabled={saving}
            className="flex-1 bg-[#171726] border border-white/10 focus:border-violet-500 rounded-xl px-3.5 py-2.5 text-sm outline-none disabled:opacity-60 transition"
          />

          <button
            type="button"
            onClick={() => save({ name: name.trim() })}
            disabled={saving || !name.trim() || name.trim() === user.name}
            className="btn-gradient rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-40 transition"
          >
            Сохранить
          </button>
        </div>
      </div>

      <div>
        <div className="text-xs text-gray-500 mb-2">Пол</div>

        <div className="flex gap-2">
          {GENDERS.map((g) => (
            <button
              key={g.value}
              type="button"
              onClick={() => {
                setGender(g.value);
                save({ gender: g.value });
              }}
              disabled={saving}
              className={`flex-1 rounded-xl py-2.5 text-sm font-medium border transition disabled:opacity-60 ${
                gender === g.value
                  ? "bg-violet-600 border-violet-500 text-white"
                  : "bg-[#171726] border-white/10 text-gray-400 hover:border-white/20"
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-red-400 text-xs mt-3">{error}</p>}

      {saving && (
        <p className="text-xs text-gray-500 mt-3 flex items-center gap-1.5">
          <Loader2 size={12} className="animate-spin" /> Сохраняем...
        </p>
      )}

      {!saving && saved && (
        <p className="text-xs text-green-400 mt-3 flex items-center gap-1.5">
          <Check size={12} /> Сохранено
        </p>
      )}
    </div>
  );
}
