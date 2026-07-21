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
