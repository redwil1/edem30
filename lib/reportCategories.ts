export const REPORT_CATEGORIES = [
  { value: "no_show", label: "Водитель не приехал / опоздал" },
  { value: "cancelled", label: "Водитель отменил без предупреждения" },
  { value: "behavior", label: "Грубое или небезопасное поведение" },
  { value: "payment", label: "Проблема с оплатой" },
  { value: "bug", label: "Ошибка в приложении" },
  { value: "other", label: "Другое" },
] as const;

export type ReportCategory = (typeof REPORT_CATEGORIES)[number]["value"];

const REPORT_CATEGORY_VALUES = REPORT_CATEGORIES.map((c) => c.value) as string[];

export function isValidReportCategory(value: unknown): value is ReportCategory {
  return typeof value === "string" && REPORT_CATEGORY_VALUES.includes(value);
}

export function reportCategoryLabel(value: string): string {
  return REPORT_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}
