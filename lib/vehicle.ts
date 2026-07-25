export const CAR_BODY_TYPES = [
  { value: "sedan", label: "Седан" },
  { value: "hatchback", label: "Хэтчбек" },
  { value: "wagon", label: "Универсал" },
  { value: "suv", label: "Внедорожник" },
  { value: "minivan", label: "Минивэн" },
] as const;

export type CarBodyType = (typeof CAR_BODY_TYPES)[number]["value"];

const CAR_BODY_TYPE_VALUES = CAR_BODY_TYPES.map((c) => c.value) as string[];

export function isValidCarBodyType(value: unknown): value is CarBodyType {
  return typeof value === "string" && CAR_BODY_TYPE_VALUES.includes(value);
}

export function carBodyTypeLabel(value: string | null): string {
  return CAR_BODY_TYPES.find((c) => c.value === value)?.label ?? "";
}

export const CAR_COLORS = [
  "Белая",
  "Чёрная",
  "Серебристая",
  "Серая",
  "Красная",
  "Синяя",
  "Зелёная",
  "Жёлтая",
  "Коричневая",
  "Оранжевая",
] as const;

export function isValidCarColor(value: unknown): value is string {
  return typeof value === "string" && (CAR_COLORS as readonly string[]).includes(value);
}

export type Vehicle = {
  bodyType: string | null;
  model: string | null;
  plate: string | null;
  color: string | null;
};

export function isVehicleComplete(vehicle: Vehicle): boolean {
  return !!(vehicle.bodyType && vehicle.model && vehicle.plate && vehicle.color);
}

// Буквы, разрешённые в гос. номерах РФ (кириллица, совпадающая по начертанию с латиницей).
const PLATE_LETTERS = "АВЕКМНОРСТУХ";

const LATIN_TO_CYRILLIC: Record<string, string> = {
  A: "А",
  B: "В",
  E: "Е",
  K: "К",
  M: "М",
  H: "Н",
  O: "О",
  P: "Р",
  C: "С",
  T: "Т",
  Y: "У",
  X: "Х",
};

/** Приводит номер к верхнему регистру и заменяет латинские буквы-омоглифы на кириллицу. */
export function normalizePlate(raw: string): string {
  return raw
    .toUpperCase()
    .split("")
    .map((ch) => LATIN_TO_CYRILLIC[ch] ?? ch)
    .join("");
}

// Стандартный формат по ГОСТ Р 50577: буква, 3 цифры, 2 буквы, код региона (2-3 цифры).
const PLATE_RE = new RegExp(`^[${PLATE_LETTERS}]\\d{3}[${PLATE_LETTERS}]{2}\\d{2,3}$`);

export function isValidPlate(raw: string): boolean {
  return PLATE_RE.test(normalizePlate(raw));
}
