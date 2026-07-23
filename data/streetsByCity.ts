import { harabaliStreets } from "./harabaliStreets";
import { astrakhanStreets } from "./astrakhanStreets";
import { ahtubinskStreets } from "./ahtubinskStreets";
import { znamenskStreets } from "./znamenskStreets";
import { kamizyakStreets } from "./kamizyakStreets";
import { krasnyyYarStreets } from "./krasnyyYarStreets";
import { narimanovStreets } from "./narimanovStreets";

export const streetsByCity: Record<string, string[]> = {
  Харабали: harabaliStreets,
  Астрахань: astrakhanStreets,
  Ахтубинск: ahtubinskStreets,
  Знаменск: znamenskStreets,
  Камызяк: kamizyakStreets,
  "Красный Яр": krasnyyYarStreets,
  Нариманов: narimanovStreets,
};

export function getStreetsForCity(city: string | null): string[] {
  return city ? streetsByCity[city] ?? [] : [];
}

export function getOtherCitiesStreets(city: string | null): { city: string; street: string }[] {
  return Object.entries(streetsByCity)
    .filter(([name]) => name !== city)
    .flatMap(([name, streets]) => streets.map((street) => ({ city: name, street })));
}
