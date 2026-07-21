export function formatPrice(price: number) {
  return new Intl.NumberFormat("ru-RU").format(price) + " ₽";
}

export function formatSeats(count: number) {
  if (count === 1) return "1 место";

  if (count >= 2 && count <= 4) return `${count} места`;

  return `${count} мест`;
}

export function formatRating(rating: number) {
  return rating.toFixed(1);
}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function formatDate(date: string) {
  const match = DATE_RE.exec(date);

  if (!match) return date;

  const parsed = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));

  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
  }).format(parsed);
}
