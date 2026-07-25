export type AdPlacement = "home" | "search" | "trip";

export const AD_PLACEMENTS: { value: AdPlacement; label: string }[] = [
  { value: "home", label: "Главная страница" },
  { value: "search", label: "Поиск поездок" },
  { value: "trip", label: "Страница поездки" },
];

export function isValidPlacement(value: unknown): value is AdPlacement {
  return typeof value === "string" && AD_PLACEMENTS.some((p) => p.value === value);
}
