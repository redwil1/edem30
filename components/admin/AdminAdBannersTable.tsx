"use client";

import { FormEvent, useEffect, useState } from "react";
import { Image as ImageIcon, Loader2, Plus, Trash2 } from "lucide-react";

import { AD_PLACEMENTS, AdPlacement } from "@/lib/adPlacements";

type AdBanner = {
  id: number;
  title: string;
  imageUrl: string;
  linkUrl: string;
  placement: AdPlacement;
  active: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
};

const PLACEMENT_LABELS = Object.fromEntries(
  AD_PLACEMENTS.map((p) => [p.value, p.label])
) as Record<AdPlacement, string>;

export default function AdminAdBannersTable() {
  const [banners, setBanners] = useState<AdBanner[] | null>(null);

  const [title, setTitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [placement, setPlacement] = useState<AdPlacement>("home");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");

  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/admin/ad-banners", { cache: "no-store" });
    const data = await res.json();
    setBanners(data.banners ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setCreating(true);

    try {
      const res = await fetch("/api/admin/ad-banners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          imageUrl,
          linkUrl,
          placement,
          startsAt: startsAt || null,
          endsAt: endsAt || null,
        }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error || "Не удалось создать баннер");
        return;
      }

      setTitle("");
      setImageUrl("");
      setLinkUrl("");
      setStartsAt("");
      setEndsAt("");
      await load();
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(b: AdBanner) {
    setBusyId(b.id);

    try {
      await fetch(`/api/admin/ad-banners/${b.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !b.active }),
      });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function remove(b: AdBanner) {
    if (!confirm(`Удалить баннер «${b.title}»?`)) return;

    setBusyId(b.id);

    try {
      await fetch(`/api/admin/ad-banners/${b.id}`, { method: "DELETE" });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 mb-6 text-sm text-amber-300">
        Раздел подготовлен заранее — баннеры нигде не показываются
        пользователям, пока блок вывода не подключат на страницы сайта.
      </div>

      <form
        onSubmit={submit}
        className="bg-[#12121c] border border-white/5 rounded-2xl p-5 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3"
      >
        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">Название (для себя)</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Автосервис «Скорость»"
            required
            maxLength={80}
            className="w-full bg-[#171726] border border-white/10 focus:border-violet-500 rounded-xl px-3.5 py-2.5 outline-none text-sm transition"
          />
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">Место показа</label>
          <select
            value={placement}
            onChange={(e) => setPlacement(e.target.value as AdPlacement)}
            className="w-full bg-[#171726] border border-white/10 focus:border-violet-500 rounded-xl px-3.5 py-2.5 outline-none text-sm transition"
          >
            {AD_PLACEMENTS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">Ссылка на картинку</label>
          <input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://..."
            required
            className="w-full bg-[#171726] border border-white/10 focus:border-violet-500 rounded-xl px-3.5 py-2.5 outline-none text-sm transition"
          />
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">Ссылка перехода</label>
          <input
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://..."
            required
            className="w-full bg-[#171726] border border-white/10 focus:border-violet-500 rounded-xl px-3.5 py-2.5 outline-none text-sm transition"
          />
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">Показывать с (необязательно)</label>
          <input
            type="date"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className="w-full bg-[#171726] border border-white/10 focus:border-violet-500 rounded-xl px-3.5 py-2.5 outline-none text-sm transition"
          />
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">Показывать до (необязательно)</label>
          <input
            type="date"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            className="w-full bg-[#171726] border border-white/10 focus:border-violet-500 rounded-xl px-3.5 py-2.5 outline-none text-sm transition"
          />
        </div>

        <button
          type="submit"
          disabled={creating}
          className="btn-gradient rounded-xl px-4 py-2.5 disabled:opacity-60 transition flex items-center justify-center gap-2 sm:col-span-2"
        >
          {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          Добавить баннер
        </button>
      </form>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {!banners ? (
        <div className="py-16 flex items-center justify-center text-gray-500">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : (
        <div className="bg-[#12121c] border border-white/5 rounded-2xl overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="text-left text-gray-500 border-b border-white/5">
                <th className="px-4 py-3 font-medium">Баннер</th>
                <th className="px-4 py-3 font-medium">Место</th>
                <th className="px-4 py-3 font-medium">Период</th>
                <th className="px-4 py-3 font-medium">Статус</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>

            <tbody>
              {banners.map((b) => (
                <tr key={b.id} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-3 font-medium flex items-center gap-2">
                    <ImageIcon size={13} className="text-violet-400 shrink-0" />
                    {b.title}
                  </td>
                  <td className="px-4 py-3 text-gray-400">{PLACEMENT_LABELS[b.placement]}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {b.startsAt ?? "—"} – {b.endsAt ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => toggleActive(b)}
                      disabled={busyId === b.id}
                      className={`text-[11px] font-medium px-2 py-1 rounded-full whitespace-nowrap transition disabled:opacity-50 ${
                        b.active
                          ? "bg-green-500/15 text-green-400 hover:bg-green-500/25"
                          : "bg-gray-500/15 text-gray-400 hover:bg-gray-500/25"
                      }`}
                    >
                      {b.active ? "Активен" : "Выключен"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => remove(b)}
                      disabled={busyId === b.id}
                      title="Удалить"
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-red-400 hover:bg-red-500/10 disabled:opacity-30 transition"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}

              {banners.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-gray-500">
                    Баннеров пока нет
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
