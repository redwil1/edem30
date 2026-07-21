"use client";

import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";

import CarModelInput from "@/components/CarModelInput";
import CarBodyIcon from "@/components/vehicle/CarBodyIcon";
import { CAR_BODY_TYPES, CAR_COLORS } from "@/lib/vehicle";

export default function VehicleSetup() {
  const [bodyType, setBodyType] = useState("");
  const [model, setModel] = useState("");
  const [plate, setPlate] = useState("");
  const [color, setColor] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const res = await fetch("/api/profile/vehicle", { cache: "no-store" });

      if (res.ok && !cancelled) {
        const data = await res.json();
        setBodyType(data.bodyType ?? "");
        setModel(data.model ?? "");
        setPlate(data.plate ?? "");
        setColor(data.color ?? "");
      }

      if (!cancelled) setLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  async function save() {
    setSaving(true);
    setError("");
    setSaved(false);

    try {
      const res = await fetch("/api/profile/vehicle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bodyType, model, plate, color }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error || "Не удалось сохранить");
        return;
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Не удалось подключиться к серверу");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-[#12121c] border border-white/5 rounded-3xl p-4 sm:p-6 flex items-center justify-center py-10 text-gray-500">
        <Loader2 size={18} className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-[#12121c] border border-white/5 rounded-3xl p-4 sm:p-6">
      <div className="font-display font-bold mb-1">Моя машина</div>

      <p className="text-xs text-gray-500 mb-4">
        Обязательно для приёма заказов такси — пассажир увидит, какая машина
        за ним едет.
      </p>

      <div className="grid grid-cols-5 gap-2 mb-4">
        {CAR_BODY_TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setBodyType(t.value)}
            className={`flex flex-col items-center gap-1.5 rounded-xl p-2.5 border transition ${
              bodyType === t.value
                ? "bg-violet-600/15 border-violet-500 text-violet-300"
                : "bg-[#171726] border-white/10 text-gray-400 hover:border-white/20"
            }`}
          >
            <CarBodyIcon type={t.value} className="w-8 h-6" />
            <span className="text-[10px] leading-tight text-center">{t.label}</span>
          </button>
        ))}
      </div>

      <div className="space-y-3">
        <CarModelInput
          value={model}
          onChange={setModel}
          placeholder="🚗 Марка и модель"
        />

        <input
          value={plate}
          onChange={(e) => setPlate(e.target.value.toUpperCase())}
          placeholder="🔢 Гос. номер"
          maxLength={20}
          className="w-full bg-[#171726] border border-white/10 focus:border-violet-500 rounded-2xl p-4 outline-none transition"
        />

        <select
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="w-full bg-[#171726] border border-white/10 focus:border-violet-500 rounded-2xl p-4 outline-none transition"
        >
          <option value="">🎨 Цвет</option>
          {CAR_COLORS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-red-400 text-sm mt-3">{error}</p>}

      <button
        onClick={save}
        disabled={saving}
        className="btn-gradient w-full disabled:opacity-60 transition rounded-2xl py-3.5 font-bold mt-4 flex items-center justify-center gap-2"
      >
        {saving ? (
          <Loader2 size={16} className="animate-spin" />
        ) : saved ? (
          <Check size={16} />
        ) : null}
        {saved ? "Сохранено" : saving ? "Сохраняем..." : "Сохранить"}
      </button>
    </div>
  );
}
