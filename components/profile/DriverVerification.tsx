"use client";

import { useEffect, useRef, useState } from "react";
import { BadgeCheck, Loader2, ShieldCheck, Upload } from "lucide-react";

type Status = "none" | "pending" | "approved" | "rejected";

const STATUS_LABELS: Record<Status, { label: string; className: string }> = {
  none: { label: "Не пройдена", className: "bg-white/5 text-gray-400" },
  pending: { label: "На рассмотрении", className: "bg-yellow-500/15 text-yellow-300" },
  approved: { label: "Подтверждён", className: "bg-green-500/15 text-green-400" },
  rejected: { label: "Отклонена", className: "bg-red-500/15 text-red-400" },
};

export default function DriverVerification() {
  const [status, setStatus] = useState<Status | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function load() {
    const res = await fetch("/api/profile/verification", { cache: "no-store" });
    const data = await res.json();
    setStatus(data.status);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleFile(file: File) {
    setError("");
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/profile/verification", {
        method: "POST",
        body: formData,
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error || "Не удалось загрузить документ");
        return;
      }

      await load();
    } catch {
      setError("Не удалось подключиться к серверу");
    } finally {
      setUploading(false);
    }
  }

  if (status === null) return null;

  const badge = STATUS_LABELS[status];

  return (
    <div className="bg-[#12121c] border border-white/5 rounded-3xl p-4 sm:p-6 mt-6">
      <div className="flex items-center gap-2 mb-2">
        <ShieldCheck size={18} className="text-violet-400" />
        <div className="font-display font-bold">Верификация водителя</div>
      </div>

      <p className="text-sm text-gray-500 mb-3">
        Загрузите фото водительского удостоверения или СТС — после проверки
        администрацией у вашего профиля появится отметка{" "}
        <BadgeCheck size={13} className="inline text-green-400" /> проверенного
        водителя.
      </p>

      <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full ${badge.className}`}>
        {badge.label}
      </span>

      {(status === "none" || status === "rejected") && (
        <div className="mt-4">
          <input
            ref={inputRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 text-sm font-medium bg-[#1c1c2b] hover:bg-white/10 disabled:opacity-60 transition rounded-xl px-4 py-2.5"
          >
            {uploading ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Upload size={15} />
            )}
            {uploading ? "Загружаем..." : "Загрузить документ"}
          </button>
        </div>
      )}

      {error && <p className="text-red-400 text-xs mt-3">{error}</p>}
    </div>
  );
}
