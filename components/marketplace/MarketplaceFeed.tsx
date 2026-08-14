"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Plus, Search, SlidersHorizontal, X } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import type { ListingCategory, ListingSummary, ListingType } from "@/lib/marketplace";
import { LISTING_CATEGORIES, LISTING_CONDITIONS } from "@/data/marketplaceCategories";
import ListingCard from "./ListingCard";

const QUICK_TYPES: { value: ListingType | "all"; label: string }[] = [
  { value: "all", label: "Все" },
  { value: "sell", label: "Продам" },
  { value: "buy", label: "Куплю" },
  { value: "free", label: "Отдам" },
  { value: "looking", label: "Ищу" },
  { value: "service", label: "Услуги" },
];

export default function MarketplaceFeed() {
  const { city: myCity } = useAuth();

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [type, setType] = useState<ListingType | "all">("all");
  const [category, setCategory] = useState<ListingCategory | null>(null);
  const [cityScope, setCityScope] = useState<"mine" | "all">(myCity ? "mine" : "all");
  const [sort, setSort] = useState<"newest" | "cheap" | "expensive">("newest");
  const [condition, setCondition] = useState<"new" | "used" | null>(null);
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [photoOnly, setPhotoOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const [listings, setListings] = useState<ListingSummary[] | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);

  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (debouncedQuery) p.set("q", debouncedQuery);
    if (type !== "all") p.set("type", type);
    if (category) p.set("category", category);
    if (cityScope === "mine" && myCity) p.set("city", myCity);
    if (condition) p.set("condition", condition);
    if (priceMin) p.set("priceMin", priceMin);
    if (priceMax) p.set("priceMax", priceMax);
    if (photoOnly) p.set("photoOnly", "1");
    if (sort !== "newest") p.set("sort", sort);
    return p.toString();
  }, [debouncedQuery, type, category, cityScope, myCity, condition, priceMin, priceMax, photoOnly, sort]);

  useEffect(() => {
    setListings(null);

    fetch(`/api/marketplace/listings?${params}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setListings(data.listings ?? []));
  }, [params]);

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-5">
        <h1 className="text-2xl sm:text-3xl font-bold">Барахолка</h1>

        <Link
          href="/marketplace/new"
          className="btn-gradient flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold whitespace-nowrap"
        >
          <Plus size={16} />
          Разместить
        </Link>
      </div>

      <div className="flex items-center gap-2 bg-[#171726] border border-white/10 focus-within:border-violet-500 rounded-2xl px-4 py-3.5 mb-3 transition">
        <Search size={18} className="text-gray-500 shrink-0" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Что ищете?"
          className="flex-1 bg-transparent outline-none text-sm placeholder:text-gray-500"
        />
        {query && (
          <button type="button" onClick={() => setQuery("")} className="text-gray-500 hover:text-white transition">
            <X size={15} />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 mb-3">
        {QUICK_TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setType(t.value)}
            className={`text-xs font-semibold px-3.5 py-2 rounded-full whitespace-nowrap transition ${
              type === t.value
                ? "bg-violet-600 text-white"
                : "bg-[#171726] text-gray-400 border border-white/10 hover:border-violet-500/40"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 mb-4 text-sm text-gray-500">
        📍 Рядом
        {myCity && (
          <button
            type="button"
            onClick={() => setCityScope("mine")}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full transition ${
              cityScope === "mine" ? "bg-violet-600/20 text-violet-300" : "bg-[#171726] text-gray-500"
            }`}
          >
            {myCity}
          </button>
        )}
        <button
          type="button"
          onClick={() => setCityScope("all")}
          className={`text-xs font-semibold px-3 py-1.5 rounded-full transition ${
            cityScope === "all" ? "bg-violet-600/20 text-violet-300" : "bg-[#171726] text-gray-500"
          }`}
        >
          Вся область
        </button>

        <button
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-white transition"
        >
          <SlidersHorizontal size={13} />
          Фильтры
        </button>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-5">
        {LISTING_CATEGORIES.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => setCategory(category === c.value ? null : c.value)}
            className={`rounded-2xl p-2.5 text-center border transition ${
              category === c.value
                ? "bg-violet-600/15 border-violet-500 text-violet-300"
                : "bg-[#12121c] border-white/5 text-gray-400 hover:border-violet-500/30"
            }`}
          >
            <div className="text-lg">{c.emoji}</div>
            <div className="text-[10px] font-medium mt-1 leading-tight">{c.label}</div>
          </button>
        ))}
      </div>

      {showFilters && (
        <div className="bg-[#12121c] border border-white/5 rounded-2xl p-4 mb-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              value={priceMin}
              onChange={(e) => setPriceMin(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              placeholder="Цена от"
              className="bg-[#171726] border border-white/10 focus:border-violet-500 rounded-xl px-3.5 py-2.5 text-sm outline-none transition"
            />
            <input
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              placeholder="Цена до"
              className="bg-[#171726] border border-white/10 focus:border-violet-500 rounded-xl px-3.5 py-2.5 text-sm outline-none transition"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {LISTING_CONDITIONS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setCondition(condition === c.value ? null : c.value)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full transition ${
                  condition === c.value ? "bg-violet-600 text-white" : "bg-[#171726] text-gray-400"
                }`}
              >
                {c.label}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setPhotoOnly((v) => !v)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full transition ${
                photoOnly ? "bg-violet-600 text-white" : "bg-[#171726] text-gray-400"
              }`}
            >
              Только с фото
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {(
              [
                ["newest", "Сначала новые"],
                ["cheap", "Сначала дешёвые"],
                ["expensive", "Сначала дорогие"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setSort(value)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full transition ${
                  sort === value ? "bg-violet-600 text-white" : "bg-[#171726] text-gray-400"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {!listings ? (
        <div className="py-16 flex items-center justify-center text-gray-500">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : listings.length === 0 ? (
        <div className="bg-[#12121c] border border-white/5 rounded-3xl p-10 text-center">
          <div className="text-gray-500 text-sm mb-4">
            {type === "looking"
              ? "Пока никто не ищет такое. Будьте первым — оставьте заявку."
              : "Ничего не нашлось по вашему запросу."}
          </div>
          <Link
            href="/marketplace/new"
            className="btn-gradient inline-flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm font-bold"
          >
            <Plus size={15} />
            Разместить объявление
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {listings.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      )}
    </div>
  );
}
