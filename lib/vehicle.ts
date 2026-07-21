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
