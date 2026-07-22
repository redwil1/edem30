const PLACEHOLDER_NAMES = [
  "аноним",
  "анонимно",
  "без имени",
  "безимени",
  "не указано",
  "неуказано",
  "user",
  "юзер",
  "пользователь",
  "test",
  "тест",
  "noname",
  "no name",
  "anonymous",
  "имя",
  "имя фамилия",
  "фио",
  "qwerty",
  "asdasd",
  "123",
  "111",
  "000",
  "xxx",
  "aaa",
];

export function isPlaceholderName(name: string): boolean {
  const normalized = name.trim().toLowerCase().replace(/\s+/g, " ");

  if (normalized.length < 2) return true;
  if (PLACEHOLDER_NAMES.includes(normalized)) return true;
  if (/^[a-zа-я]$/i.test(normalized)) return true;
  if (/^\d+$/.test(normalized)) return true;
  if (/^(.)\1*$/.test(normalized.replace(/\s/g, ""))) return true;

  return false;
}
