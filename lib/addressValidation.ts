import { streetsByCity } from "@/data/streetsByCity";
import { cities } from "@/lib/cities";
import { containsProfanity } from "@/lib/profanity";

const HOUSE_MARKER = ", д. ";
const OTHER_CITY_RE = /^г\.\s*([^,]+),\s*(.+)$/;

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function isKnownStreet(street: string, city: string): boolean {
  const streets = streetsByCity[city];
  if (!streets) return false;

  const target = normalize(street);
  return streets.some((s) => normalize(s) === target);
}

function isSaneFreeText(text: string): boolean {
  const trimmed = text.trim();

  if (trimmed.length < 2 || trimmed.length > 120) return false;
  if (!/[а-яa-z]/i.test(trimmed)) return false;
  if (/^(.)\1*$/.test(trimmed.replace(/\s/g, ""))) return false;

  return !containsProfanity(trimmed);
}

/**
 * Проверяет, что адрес — это либо реальная улица из справочника выбранного
 * города (опционально с номером дома), либо, для городов без справочника,
 * разумный текст без мата/бессмыслицы.
 */
export function isValidAddress(address: string, city: string | null): boolean {
  const trimmed = address.trim();
  if (!trimmed) return false;
  if (containsProfanity(trimmed)) return false;

  let rest = trimmed;
  let targetCity = city;

  const otherCityMatch = OTHER_CITY_RE.exec(rest);
  if (otherCityMatch) {
    const [, otherCity, remainder] = otherCityMatch;
    if (!cities.includes(otherCity.trim())) return false;
    targetCity = otherCity.trim();
    rest = remainder.trim();
  }

  if (!targetCity || !cities.includes(targetCity)) return false;

  const markerIndex = rest.indexOf(HOUSE_MARKER);
  const streetPart = markerIndex === -1 ? rest : rest.slice(0, markerIndex);
  const housePart =
    markerIndex === -1 ? "" : rest.slice(markerIndex + HOUSE_MARKER.length).trim();

  if (markerIndex !== -1 && housePart && !/^\d{1,4}[а-яa-z]?$/i.test(housePart)) {
    return false;
  }

  if (streetsByCity[targetCity]) {
    return isKnownStreet(streetPart, targetCity);
  }

  return isSaneFreeText(streetPart);
}
