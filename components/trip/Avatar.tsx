"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

import AvatarPresetIcon from "@/components/avatar/AvatarPresetIcon";

type Props = {
  name: string;
  size?: number;
  tone?: "violet" | "neutral";
  avatarUrl?: string | null;
  avatarPreset?: string | null;
};

export default function Avatar({ name, size = 36, avatarUrl, avatarPreset }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const initials = name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (avatarUrl) {
    return (
      <>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen(true);
          }}
          className="shrink-0 rounded-full cursor-zoom-in"
          aria-label={`Открыть фото профиля: ${name}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={avatarUrl}
            alt={name}
            style={{ width: size, height: size }}
            className="rounded-full object-cover shrink-0"
          />
        </button>

        {open && (
          <div
            className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-6"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpen(false);
            }}
          >
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setOpen(false);
              }}
              className="absolute top-5 right-5 text-white/70 hover:text-white transition"
              aria-label="Закрыть"
            >
              <X size={28} />
            </button>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatarUrl}
              alt={name}
              className="max-w-[90vw] max-h-[85vh] rounded-2xl object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </>
    );
  }

  if (avatarPreset) {
    return <AvatarPresetIcon preset={avatarPreset} size={size} />;
  }

  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      className="avatar-gradient rounded-full flex items-center justify-center font-bold shrink-0 text-gray-300"
    >
      {initials}
    </div>
  );
}
