export const AVATAR_PRESETS = [
  { id: "p1", color: "#7c3aed" },
  { id: "p2", color: "#2563eb" },
  { id: "p3", color: "#0891b2" },
  { id: "p4", color: "#059669" },
  { id: "p5", color: "#d97706" },
  { id: "p6", color: "#dc2626" },
  { id: "p7", color: "#db2777" },
  { id: "p8", color: "#4b5563" },
] as const;

const AVATAR_PRESET_IDS = AVATAR_PRESETS.map((p) => p.id) as string[];

export function isValidAvatarPreset(value: unknown): value is string {
  return typeof value === "string" && AVATAR_PRESET_IDS.includes(value);
}

export function avatarPresetColor(id: string | null | undefined): string | null {
  return AVATAR_PRESETS.find((p) => p.id === id)?.color ?? null;
}

export const GENDERS = [
  { value: "male", label: "Мужской" },
  { value: "female", label: "Женский" },
] as const;

export function isValidGender(value: unknown): value is string {
  return typeof value === "string" && GENDERS.some((g) => g.value === value);
}
