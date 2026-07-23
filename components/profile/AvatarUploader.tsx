"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Check, Loader2, X } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import { compressImage, ImageCompressError } from "@/lib/imageCompress";
import AvatarPresetIcon from "@/components/avatar/AvatarPresetIcon";
import { AVATAR_PRESETS } from "@/lib/avatarPresets";

const MAX_SIZE = 5 * 1024 * 1024;

export default function AvatarUploader() {
  const { user, refresh } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  async function handleFile(rawFile: File) {
    setError("");

    if (!rawFile.type.startsWith("image/")) {
      setError("Выберите изображение");
      return;
    }

    setUploading(true);

    try {
      const file = await compressImage(rawFile, 640, 0.85);

      if (file.size > MAX_SIZE) {
        setError("Файл слишком большой даже после сжатия. Попробуйте другое фото.");
        return;
      }

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/profile/avatar", {
        method: "POST",
        body: formData,
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error || "Не удалось загрузить фото");
        return;
      }

      await refresh();
      setOpen(false);
    } catch (err) {
      setError(
        err instanceof ImageCompressError
          ? err.message
          : "Не удалось подключиться к серверу"
      );
    } finally {
      setUploading(false);
    }
  }

  async function choosePreset(preset: string | null) {
    setError("");
    setSaving(true);

    try {
      const res = await fetch("/api/profile/identity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarPreset: preset }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error || "Не удалось сохранить");
        return;
      }

      await refresh();
      setOpen(false);
    } catch {
      setError("Не удалось подключиться к серверу");
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;

  const busy = uploading || saving;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative w-16 h-16 rounded-full overflow-hidden shrink-0 group"
        title="Изменить фото профиля"
      >
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatarUrl}
            alt={user.name}
            className="w-full h-full object-cover"
          />
        ) : user.avatarPreset ? (
          <AvatarPresetIcon preset={user.avatarPreset} size={64} />
        ) : (
          <div className="avatar-gradient w-full h-full flex items-center justify-center font-bold text-lg text-gray-300">
            {user.name
              .split(" ")
              .map((p) => p[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>
        )}

        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
          <Camera size={18} />
        </div>
      </button>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-sm font-medium text-violet-400 hover:text-violet-300 transition mt-2"
      >
        <Camera size={14} />
        Изменить фото
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-5"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-[#171726] border border-white/10 rounded-3xl p-5 sm:p-6 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="font-display font-bold">Фото профиля</div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-white/5 transition"
                aria-label="Закрыть"
              >
                <X size={16} />
              </button>
            </div>

            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 bg-[#202030] hover:bg-white/10 border border-white/10 rounded-xl py-3 text-sm font-medium disabled:opacity-60 transition mb-5"
            >
              {uploading ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Camera size={15} />
              )}
              {uploading ? "Загружаем..." : "Загрузить своё фото"}
            </button>

            <div className="text-xs text-gray-500 mb-2">Готовые аватарки</div>

            <div className="flex flex-wrap gap-2">
              {AVATAR_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => choosePreset(p.id)}
                  disabled={busy}
                  className="rounded-full disabled:opacity-60 transition"
                >
                  <AvatarPresetIcon preset={p.id} size={44} />
                </button>
              ))}

              <button
                type="button"
                onClick={() => choosePreset(null)}
                disabled={busy}
                className="w-11 h-11 rounded-full border border-white/10 text-[10px] text-gray-400 hover:border-white/20 disabled:opacity-60 transition"
                title="Использовать инициалы"
              >
                Аа
              </button>
            </div>

            {error && <p className="text-red-400 text-xs mt-3">{error}</p>}

            {saving && (
              <p className="text-xs text-gray-500 mt-3 flex items-center gap-1.5">
                <Loader2 size={12} className="animate-spin" /> Сохраняем...
              </p>
            )}

            {!busy && !error && (
              <p className="text-xs text-gray-500 mt-3 flex items-center gap-1.5">
                <Check size={12} /> Изменения сохраняются сразу
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
