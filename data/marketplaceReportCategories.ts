export const MARKETPLACE_REPORT_CATEGORIES = [
  { value: "fraud", label: "Мошенничество" },
  { value: "prohibited", label: "Запрещённый товар" },
  { value: "spam", label: "Спам" },
  { value: "wrong_info", label: "Неверная информация" },
  { value: "other", label: "Другое" },
] as const;

export type MarketplaceReportCategory = (typeof MARKETPLACE_REPORT_CATEGORIES)[number]["value"];

const CATEGORY_VALUES = MARKETPLACE_REPORT_CATEGORIES.map((c) => c.value) as string[];

export function isValidMarketplaceReportCategory(
  value: unknown
): value is MarketplaceReportCategory {
  return typeof value === "string" && CATEGORY_VALUES.includes(value);
}

export function marketplaceReportCategoryLabel(value: string): string {
  return MARKETPLACE_REPORT_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}
