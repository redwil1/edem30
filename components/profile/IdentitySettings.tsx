"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import AvatarPresetIcon from "@/components/avatar/AvatarPresetIcon";
import { AVATAR_PRESETS, GENDERS } from "@/lib/avatarPresets";

export default function IdentitySettings() {
  const { user, refresh } = useAuth();
  const [gender, setGender] = useState(user?.gender ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  if (!user) return null;

  async function save(patch: { gender?: string | null; avatarPreset?: string | null }) {
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
      <div className="font-display font-bold mb-4">Аватарка и профиль</div>

      <div className="mb-5">
        <div className="text-xs text-gray-500 mb-2">Готовые аватарки</div>

        <div className="flex flex-wrap gap-2">
          {AVATAR_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => save({ avatarPreset: p.id })}
              disabled={saving}
              className="rounded-full disabled:opacity-60 ring-offset-2 ring-offset-[#12121c] transition"
            >
              <AvatarPresetIcon preset={p.id} size={44} />
            </button>
          ))}

          <button
            type="button"
            onClick={() => save({ avatarPreset: null })}
            disabled={saving}
            className="w-11 h-11 rounded-full border border-white/10 text-[10px] text-gray-400 hover:border-white/20 disabled:opacity-60 transition"
            title="Использовать инициалы"
          >
            Аа
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
