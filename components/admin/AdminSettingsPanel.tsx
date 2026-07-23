"use client";

import { FormEvent, useEffect, useState } from "react";
import { Check, Loader2, Save } from "lucide-react";

type Settings = {
  commission_percent: string;
  min_taxi_price: string;
  min_trip_price: string;
  support_phone: string;
  support_email: string;
};

const FIELDS: { key: keyof Settings; label: string; type: string }[] = [
  { key: "commission_percent", label: "Комиссия сервиса, %", type: "number" },
  { key: "min_taxi_price", label: "Минимальная цена заказа такси, ₽", type: "number" },
  { key: "min_trip_price", label: "Минимальная цена места в поездке, ₽", type: "number" },
  { key: "support_phone", label: "Телефон поддержки", type: "text" },
  { key: "support_email", label: "Email поддержки", type: "text" },
];

export default function AdminSettingsPanel() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setSettings(data.settings));
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!settings) return;

    setError("");
    setSaving(true);
    setSaved(false);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error || "Не удалось сохранить настройки");
        return;
      }

      setSettings(data.settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  if (!settings) {
    return (
      <div className="py-16 flex items-center justify-center text-gray-500">
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="bg-[#12121c] border border-white/5 rounded-2xl p-6 max-w-xl space-y-4"
    >
      {FIELDS.map((f) => (
        <div key={f.key}>
          <label className="text-xs text-gray-500 mb-1.5 block">{f.label}</label>
          <input
            type={f.type}
            value={settings[f.key]}
            onChange={(e) => setSettings({ ...settings, [f.key]: e.target.value })}
            className="w-full bg-[#171726] border border-white/10 focus:border-violet-500 rounded-xl px-3.5 py-2.5 outline-none text-sm transition"
          />
        </div>
      ))}

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="btn-gradient rounded-xl px-5 py-2.5 text-sm font-medium disabled:opacity-60 transition flex items-center gap-2"
      >
        {saving ? (
          <Loader2 size={15} className="animate-spin" />
        ) : saved ? (
          <Check size={15} />
        ) : (
          <Save size={15} />
        )}
        {saved ? "Сохранено" : "Сохранить"}
      </button>
    </form>
  );
}
