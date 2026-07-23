const PROFANITY_ROOTS = [
  "хуй",
  "хуе",
  "хуё",
  "хуя",
  "хуи",
  "пизд",
  "ебат",
  "ебал",
  "ебан",
  "ёбан",
  "ебуч",
  "ебля",
  "ебис",
  "ебуч",
  "уебан",
  "уебищ",
  "заеб",
  "разъеб",
  "долбоеб",
  "долбаеб",
  "мудак",
  "мудил",
  "бляд",
  "гандон",
  "гондон",
  "педик",
  "пидор",
  "пидар",
  "пидр",
  "залуп",
  "манда",
  "мразь",
  "ссанин",
  "говнюк",
  "говнищ",
  "дерьмо",
  "шлюх",
  "дроч",
  "нахуй",
  "нахер",
  "сука",
  "сучар",
  "чмо",
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^а-я\s]/g, "")
    .replace(/(.)\1{1,}/g, "$1");
}

export function containsProfanity(text: string): boolean {
  const words = normalize(text).split(/\s+/).filter(Boolean);

  return words.some((word) => PROFANITY_ROOTS.some((root) => word.includes(root)));
}
