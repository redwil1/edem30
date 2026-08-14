import type { ListingCategory, ListingType, Condition } from "@/lib/marketplace";

export const LISTING_CATEGORIES: { value: ListingCategory; label: string; emoji: string }[] = [
  { value: "auto", label: "Авто и запчасти", emoji: "🚗" },
  { value: "electronics", label: "Телефоны и электроника", emoji: "📱" },
  { value: "home", label: "Дом и дача", emoji: "🏠" },
  { value: "clothes", label: "Одежда и обувь", emoji: "👕" },
  { value: "services", label: "Услуги", emoji: "🛠" },
  { value: "jobs", label: "Работа", emoji: "💼" },
  { value: "animals", label: "Животные", emoji: "🐕" },
  { value: "other", label: "Другое", emoji: "📦" },
];

export const LISTING_TYPES: { value: ListingType; label: string }[] = [
  { value: "sell", label: "Продам" },
  { value: "buy", label: "Куплю" },
  { value: "free", label: "Отдам" },
  { value: "looking", label: "Ищу" },
  { value: "exchange", label: "Обмен" },
  { value: "service", label: "Услуга" },
];

export const LISTING_CONDITIONS: { value: Condition; label: string }[] = [
  { value: "new", label: "Новое" },
  { value: "used", label: "Б/у" },
];

const CATEGORY_VALUES = LISTING_CATEGORIES.map((c) => c.value) as string[];
const TYPE_VALUES = LISTING_TYPES.map((t) => t.value) as string[];
const CONDITION_VALUES = LISTING_CONDITIONS.map((c) => c.value) as string[];

export function isValidCategory(value: unknown): value is ListingCategory {
  return typeof value === "string" && CATEGORY_VALUES.includes(value);
}

export function isValidListingType(value: unknown): value is ListingType {
  return typeof value === "string" && TYPE_VALUES.includes(value);
}

export function isValidCondition(value: unknown): value is Condition {
  return typeof value === "string" && CONDITION_VALUES.includes(value);
}

export function categoryLabel(value: string): string {
  return LISTING_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

export function typeLabel(value: string): string {
  return LISTING_TYPES.find((t) => t.value === value)?.label ?? value;
}
