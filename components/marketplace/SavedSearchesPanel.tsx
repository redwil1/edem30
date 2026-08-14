"use client";

import { useEffect, useState } from "react";
import { Bell, Loader2, Trash2 } from "lucide-react";

import { LISTING_CATEGORIES, categoryLabel } from "@/data/marketplaceCategories";
import type { ListingCategory } from "@/lib/marketplace";

type SavedSearch = {
  id: number;
  query: string;
  category: ListingCategory | null;
  city: string | null;
  priceMin: number | null;
  priceMax: number | null;
  notify: boolean;
  createdAt: string;
};

export default function SavedSearchesPanel() {
  const [searches, setSearches] = useState<SavedSearch[] | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ListingCategory | "">("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/marketplace/saved-searches", { cache: "no-store" });
    const data = await res.json();
    setSearches(data.searches ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function create() {
    if (!query.trim() && !category) {
      setError("Укажите запрос или категорию");
      return;
    }

    setSaving(true);
    setError("");

    const res = await fetch("/api/marketplace/saved-searches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: query.trim(), category: category || null, notify: true }),
    });
    const data = await res.json().catch(() => null);

    setSaving(false);

    if (!res.ok) {
      setError(data?.error || "Не удалось сохранить поиск");
      return;
    }

    setQuery("");
    setCategory("");
    await load();
  }

  async function remove(id: number) {
    await fetch(`/api/marketplace/saved-searches?id=${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div>
      <div className="bg-[#12121c] border border-white/5 rounded-2xl p-4 mb-4">
        <div className="text-sm font-bold mb-3">Сохранить поиск</div>

        <div className="flex gap-2 mb-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Например: iPhone 13"
            className="flex-1 bg-[#171726] border border-white/10 focus:border-violet-500 rounded-xl px-3.5 py-2.5 text-sm outline-none transition"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap mb-3">
          {LISTING_CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCategory(category === c.value ? "" : c.value)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full transition ${
                category === c.value ? "bg-violet-600 text-white" : "bg-[#171726] text-gray-400"
              }`}
            >
              {c.emoji} {c.label}
            </button>
          ))}
        </div>

        {error && <p className="text-red-400 text-xs mb-2">{error}</p>}

        <button
          type="button"
          onClick={create}
          disabled={saving}
          className="flex items-center gap-1.5 btn-gradient rounded-xl px-4 py-2 text-xs font-bold disabled:opacity-60"
        >
          {saving && <Loader2 size={13} className="animate-spin" />}
          <Bell size={13} />
          Уведомлять о новых объявлениях
        </button>
      </div>

      {!searches ? (
        <div className="py-8 flex items-center justify-center text-gray-500">
          <Loader2 size={18} className="animate-spin" />
        </div>
      ) : searches.length === 0 ? (
        <div className="text-sm text-gray-500 text-center py-6">Сохранённых поисков пока нет</div>
      ) : (
        <div className="space-y-2">
          {searches.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between gap-3 bg-[#12121c] border border-white/5 rounded-xl px-4 py-3"
            >
              <div className="text-sm">
                {s.query || (s.category ? categoryLabel(s.category) : "Любые объявления")}
                {s.query && s.category && <span className="text-gray-500"> · {categoryLabel(s.category)}</span>}
              </div>
              <button
                type="button"
                onClick={() => remove(s.id)}
                className="text-gray-500 hover:text-red-400 transition shrink-0"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
