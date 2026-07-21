export function formatPrice(price: number) {
  return new Intl.NumberFormat("ru-RU").format(price) + " ₽";
}

export function formatSeats(count: number) {
  if (count === 1) return "1 место";

  if (count >= 2 && count <= 4) return `${count} места`;

  return `${count} мест`;
}

export function formatRating(rating: number) {
  return `${rating.toFixed(1)} из 5`;
}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function formatTimeAgo(iso: string | null): string {
  if (!iso) return "недавно";

  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return "только что";

  if (diffMin < 60) {
    const mod10 = diffMin % 10;
    const mod100 = diffMin % 100;
    const word =
      mod10 === 1 && mod100 !== 11
        ? "минуту"
        : mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)
        ? "минуты"
        : "минут";
    return `${diffMin} ${word} назад`;
  }

  const diffHours = Math.floor(diffMin / 60);

  if (diffHours < 24) {
    const mod10 = diffHours % 10;
    const mod100 = diffHours % 100;
    const word =
      mod10 === 1 && mod100 !== 11
        ? "час"
        : mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)
        ? "часа"
        : "часов";
    return `${diffHours} ${word} назад`;
  }

  const diffDays = Math.floor(diffHours / 24);
  const mod10 = diffDays % 10;
  const mod100 = diffDays % 100;
  const word =
    mod10 === 1 && mod100 !== 11
      ? "день"
      : mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)
      ? "дня"
      : "дней";
  return `${diffDays} ${word} назад`;
}

export function formatDate(date: string) {
  const match = DATE_RE.exec(date);

  if (!match) return date;

  const parsed = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));

  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
  }).format(parsed);
}
