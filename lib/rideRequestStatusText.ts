/** Текстовый статус кластера формирующейся поездки по количеству ожидающих. */
export function formingStatusText(waitingCount: number): string {
  if (waitingCount <= 1) return "Появился первый пассажир";
  if (waitingCount === 2) return "Уже есть попутчики";
  if (waitingCount === 3) return "Поездка активно собирается";
  return "Осталось найти водителя";
}

export const HOT_THRESHOLD = 3;
