"use client";

import { useEffect, useState } from "react";
import { Loader2, MapPin, Plus, Trash2 } from "lucide-react";

type FavoriteAddress = {
  id: number;
  label: string;
  address: string;
};

export default function FavoriteAddressesManager() {
  const [addresses, setAddresses] = useState<FavoriteAddress[] | null>(null);
  const [label, setLabel] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/favorite-addresses", { cache: "no-store" });
    const data = await res.json();
    setAddresses(data.addresses ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function add() {
    if (!label.trim() || !address.trim()) {
      setError("Укажите название и адрес");
      return;
    }

    setError("");
    setSaving(true);

    try {
      const res = await fetch("/api/favorite-addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label.trim(), address: address.trim() }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error || "Не удалось сохранить");
        return;
      }

      setLabel("");
      setAddress("");
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: number) {
    setDeletingId(id);
    await fetch(`/api/favorite-addresses/${id}`, { method: "DELETE" });
    await load();
    setDeletingId(null);
  }

  return (
    <div className="bg-[#12121c] border border-white/5 rounded-3xl p-4 sm:p-6 mt-6">
      <div className="flex items-center gap-2 mb-4">
        <MapPin size={18} className="text-violet-400" />
        <div className="font-display font-bold">Избранные адреса</div>
      </div>

      {!addresses ? (
        <div className="py-6 flex items-center justify-center text-gray-500">
          <Loader2 size={18} className="animate-spin" />
        </div>
      ) : (
        <div className="space-y-2 mb-4">
          {addresses.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between gap-3 bg-[#1c1c2b] rounded-xl px-4 py-3"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium">{a.label}</div>
                <div className="text-xs text-gray-500 mt-0.5 truncate">{a.address}</div>
              </div>

              <button
                type="button"
                onClick={() => remove(a.id)}
                disabled={deletingId === a.id}
                className="text-red-400 hover:text-red-300 disabled:opacity-60 transition shrink-0"
              >
                {deletingId === a.id ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Trash2 size={15} />
                )}
              </button>
            </div>
          ))}

          {addresses.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-2">
              Пока нет сохранённых адресов
            </p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Дом / Работа"
          maxLength={30}
          className="w-full bg-[#171726] border border-white/10 focus:border-violet-500 rounded-xl px-3.5 py-2.5 text-sm outline-none transition"
        />

        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Полный адрес, например: ул. Ленина, д. 10"
          maxLength={200}
          className="w-full bg-[#171726] border border-white/10 focus:border-violet-500 rounded-xl px-3.5 py-2.5 text-sm outline-none transition"
        />

        <button
          type="button"
          onClick={add}
          disabled={saving}
          className="flex items-center justify-center gap-1.5 btn-gradient rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-60 transition w-full"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Добавить
        </button>
      </div>

      {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
    </div>
  );
}
