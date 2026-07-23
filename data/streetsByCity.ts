import { harabaliStreets } from "./harabaliStreets";
import { astrakhanStreets } from "./astrakhanStreets";

export const streetsByCity: Record<string, string[]> = {
  Харабали: harabaliStreets,
  Астрахань: astrakhanStreets,
};

export function getStreetsForCity(city: string | null): string[] {
  return city ? streetsByCity[city] ?? [] : [];
}

export function getOtherCitiesStreets(city: string | null): { city: string; street: string }[] {
  return Object.entries(streetsByCity)
    .filter(([name]) => name !== city)
    .flatMap(([name, streets]) => streets.map((street) => ({ city: name, street })));
}
