"use client";

import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import { compressImage } from "@/lib/imageCompress";

const MAX_SIZE = 5 * 1024 * 1024;

export default function AvatarUploader() {
  const { user, refresh } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

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
    } catch {
      setError("Не удалось подключиться к серверу");
    } finally {
      setUploading(false);
    }
  }

  if (!user) return null;

  function openPicker() {
    inputRef.current?.click();
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={openPicker}
          disabled={uploading}
          className="relative w-16 h-16 rounded-full overflow-hidden shrink-0 group disabled:opacity-70"
          title="Изменить фото профиля"
        >
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="w-full h-full object-cover"
            />
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
            {uploading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Camera size={18} />
            )}
          </div>
        </button>

        <button
          type="button"
          onClick={openPicker}
          disabled={uploading}
          className="flex items-center gap-1.5 text-sm font-medium text-violet-400 hover:text-violet-300 disabled:opacity-60 transition"
        >
          {uploading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Camera size={14} />
          )}
          {uploading ? "Загружаем..." : "Изменить фото"}
        </button>
      </div>

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

      {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
    </div>
  );
}
