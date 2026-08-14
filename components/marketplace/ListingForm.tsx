"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, X } from "lucide-react";

import CityModal from "@/components/CityModal";
import { compressImage, ImageCompressError } from "@/lib/imageCompress";
import { LISTING_CATEGORIES, LISTING_CONDITIONS, LISTING_TYPES } from "@/data/marketplaceCategories";
import type {
  Condition,
  ListingCategory,
  ListingType,
  PriceType,
} from "@/lib/marketplace";

export type ListingFormValues = {
  type: ListingType;
  category: ListingCategory | "";
  title: string;
  description: string;
  price: string;
  priceType: PriceType;
  city: string;
  condition: Condition | "";
  urgent: boolean;
  exchangePossible: boolean;
  photoUrls: string[];
};

const EMPTY: ListingFormValues = {
  type: "sell",
  category: "",
  title: "",
  description: "",
  price: "",
  priceType: "fixed",
  city: "",
  condition: "",
  urgent: false,
  exchangePossible: false,
  photoUrls: [],
};

const MAX_PHOTOS = 5;
const MAX_PHOTO_SIZE = 5 * 1024 * 1024;

type Props = {
  mode: "create" | "edit";
  listingId?: number;
  initial?: ListingFormValues;
};

export default function ListingForm({ mode, listingId, initial }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [values, setValues] = useState<ListingFormValues>(initial ?? EMPTY);
  const [cityModalOpen, setCityModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function set<K extends keyof ListingFormValues>(key: K, value: ListingFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function addPhoto(rawFile: File) {
    setError("");

    if (values.photoUrls.length >= MAX_PHOTOS) {
      setError(`Максимум ${MAX_PHOTOS} фото`);
      return;
    }

    if (!rawFile.type.startsWith("image/")) {
      setError("Можно загружать только изображения");
      return;
    }

    setUploading(true);

    try {
      const file = await compressImage(rawFile, 1600, 0.82);

      if (file.size > MAX_PHOTO_SIZE) {
        setError("Фото слишком большое даже после сжатия");
        return;
      }

      const signRes = await fetch("/api/marketplace/photos-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType: file.type }),
      });
      const signData = await signRes.json().catch(() => null);

      if (!signRes.ok) {
        setError(signData?.error || "Не удалось подготовить загрузку");
        return;
      }

      const putRes = await fetch(signData.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!putRes.ok) {
        setError("Не удалось загрузить фото");
        return;
      }

      set("photoUrls", [...values.photoUrls, signData.publicUrl]);
    } catch (err) {
      setError(err instanceof ImageCompressError ? err.message : "Не удалось подключиться к серверу");
    } finally {
      setUploading(false);
    }
  }

  function removePhoto(url: string) {
    set(
      "photoUrls",
      values.photoUrls.filter((u) => u !== url)
    );
  }

  async function submit() {
    setError("");

    if (!values.category) {
      setError("Выберите категорию");
      return;
    }

    if (!values.title.trim() || values.title.trim().length < 3) {
      setError("Укажите название объявления");
      return;
    }

    if (!values.city) {
      setError("Укажите город");
      return;
    }

    if (values.priceType !== "free" && !values.price) {
      setError("Укажите цену");
      return;
    }

    setSubmitting(true);

    const payload = {
      type: values.type,
      category: values.category,
      title: values.title.trim(),
      description: values.description.trim(),
      price: values.priceType === "free" ? null : Number(values.price),
      priceType: values.priceType,
      city: values.city,
      condition: values.condition || null,
      urgent: values.urgent,
      exchangePossible: values.exchangePossible,
      photoUrls: values.photoUrls,
    };

    const res = await fetch(
      mode === "create" ? "/api/marketplace/listings" : `/api/marketplace/listings/${listingId}`,
      {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    const data = await res.json().catch(() => null);

    setSubmitting(false);

    if (!res.ok) {
      setError(data?.error || "Не удалось сохранить объявление");
      return;
    }

    router.push(`/marketplace/${mode === "create" ? data.id : listingId}`);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div>
        <label className="text-xs text-gray-500 mb-2 block">Тип объявления</label>
        <div className="grid grid-cols-3 gap-2">
          {LISTING_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => set("type", t.value)}
              className={`text-xs font-semibold py-2.5 rounded-xl border transition ${
                values.type === t.value
                  ? "bg-violet-600/20 border-violet-500 text-violet-300"
                  : "bg-[#171726] border-white/10 text-gray-400"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-500 mb-2 block">
          Фотографии ({values.photoUrls.length}/{MAX_PHOTOS})
        </label>
        <div className="flex gap-2 flex-wrap">
          {values.photoUrls.map((url) => (
            <div key={url} className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removePhoto(url)}
                className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center"
              >
                <X size={12} />
              </button>
            </div>
          ))}

          {values.photoUrls.length < MAX_PHOTOS && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-16 h-16 rounded-xl border-2 border-dashed border-white/15 flex items-center justify-center text-gray-500 hover:border-violet-500/40 transition disabled:opacity-60 shrink-0"
            >
              {uploading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) addPhoto(file);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-500 mb-1.5 block">Название</label>
        <input
          value={values.title}
          onChange={(e) => set("title", e.target.value.slice(0, 120))}
          placeholder="Например: Диван угловой, раскладной"
          className="w-full bg-[#171726] border border-white/10 focus:border-violet-500 rounded-xl px-3.5 py-2.5 text-sm outline-none transition"
        />
      </div>

      <div>
        <label className="text-xs text-gray-500 mb-1.5 block">Описание</label>
        <textarea
          value={values.description}
          onChange={(e) => set("description", e.target.value.slice(0, 3000))}
          rows={4}
          placeholder="Расскажите подробнее — состояние, причина продажи, детали"
          className="w-full bg-[#171726] border border-white/10 focus:border-violet-500 rounded-xl px-3.5 py-2.5 text-sm outline-none transition resize-none"
        />
      </div>

      <div>
        <label className="text-xs text-gray-500 mb-2 block">Категория</label>
        <div className="grid grid-cols-4 gap-2">
          {LISTING_CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => set("category", c.value)}
              className={`rounded-xl p-2.5 text-center border transition ${
                values.category === c.value
                  ? "bg-violet-600/15 border-violet-500 text-violet-300"
                  : "bg-[#171726] border-white/10 text-gray-400"
              }`}
            >
              <div className="text-base">{c.emoji}</div>
              <div className="text-[10px] font-medium mt-1 leading-tight">{c.label}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-500 mb-1.5 block">Город</label>
        <button
          type="button"
          onClick={() => setCityModalOpen(true)}
          className="w-full text-left bg-[#171726] border border-white/10 hover:border-violet-500/40 rounded-xl px-3.5 py-2.5 text-sm transition"
        >
          {values.city || <span className="text-gray-500">Выбрать город</span>}
        </button>
        <CityModal
          open={cityModalOpen}
          onClose={() => setCityModalOpen(false)}
          onSelect={(c) => set("city", c)}
        />
      </div>

      {values.priceType !== "free" && (
        <div>
          <label className="text-xs text-gray-500 mb-1.5 block">Цена, ₽</label>
          <input
            value={values.price}
            onChange={(e) => set("price", e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            placeholder="0"
            className="w-full bg-[#171726] border border-white/10 focus:border-violet-500 rounded-xl px-3.5 py-2.5 text-sm outline-none transition"
          />
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {(
          [
            ["fixed", "Цена фиксированная"],
            ["negotiable", "Торг уместен"],
            ["free", "Бесплатно"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => set("priceType", value)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full transition ${
              values.priceType === value ? "bg-violet-600 text-white" : "bg-[#171726] text-gray-400"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div>
        <label className="text-xs text-gray-500 mb-2 block">Состояние (необязательно)</label>
        <div className="flex items-center gap-2">
          {LISTING_CONDITIONS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => set("condition", values.condition === c.value ? "" : c.value)}
              className={`text-xs font-medium px-3.5 py-2 rounded-full transition ${
                values.condition === c.value ? "bg-violet-600 text-white" : "bg-[#171726] text-gray-400"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[#12121c] border border-white/5 rounded-2xl overflow-hidden">
        <label className="flex items-center justify-between px-4 py-3.5 border-b border-white/5 cursor-pointer">
          <span className="text-sm text-gray-300">🔥 Срочно</span>
          <input
            type="checkbox"
            checked={values.urgent}
            onChange={(e) => set("urgent", e.target.checked)}
            className="w-4 h-4 accent-violet-600"
          />
        </label>

        <label className="flex items-center justify-between px-4 py-3.5 cursor-pointer">
          <span className="text-sm text-gray-300">🔄 Возможен обмен</span>
          <input
            type="checkbox"
            checked={values.exchangePossible}
            onChange={(e) => set("exchangePossible", e.target.checked)}
            className="w-4 h-4 accent-violet-600"
          />
        </label>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={submitting}
        className="btn-gradient w-full rounded-2xl py-4 font-bold disabled:opacity-60 transition flex items-center justify-center gap-2"
      >
        {submitting && <Loader2 size={16} className="animate-spin" />}
        {mode === "create" ? "Опубликовать" : "Сохранить"}
      </button>
    </div>
  );
}
