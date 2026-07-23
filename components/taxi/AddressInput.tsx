"use client";

import { useState } from "react";
import { getOtherCitiesStreets, getStreetsForCity } from "@/data/streetsByCity";
import { isValidAddress } from "@/lib/addressValidation";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  inputClassName?: string;
  city?: string | null;
};

const HOUSE_MARKER = ", д. ";
const HOUSE_NUMBERS = Array.from({ length: 150 }, (_, i) => String(i + 1));
const MAX_LOCAL_MATCHES = 6;
const MAX_OTHER_MATCHES = 4;

const DEFAULT_INPUT_CLASSNAME =
  "w-full bg-[#171726] border border-white/10 focus:border-violet-500 rounded-2xl p-4 outline-none transition";

type StreetMatch = {
  label: string;
  value: string;
};

export default function AddressInput({
  value,
  onChange,
  placeholder,
  inputClassName,
  city,
}: Props) {
  const [open, setOpen] = useState(false);
  const [invalid, setInvalid] = useState(false);

  const markerIndex = value.indexOf(HOUSE_MARKER);
  const inHouseMode = markerIndex !== -1;

  const housePrefix = inHouseMode
    ? value.slice(markerIndex + HOUSE_MARKER.length).trim()
    : "";

  const streetQuery = value.trim().toLowerCase();

  const localStreets = getStreetsForCity(city ?? null);

  const localMatches: StreetMatch[] =
    !inHouseMode && streetQuery.length > 0
      ? localStreets
          .filter((street) => street.toLowerCase().includes(streetQuery))
          .slice(0, MAX_LOCAL_MATCHES)
          .map((street) => ({ label: street, value: street }))
      : [];

  const otherMatches: StreetMatch[] =
    !inHouseMode && streetQuery.length > 0 && localMatches.length < MAX_LOCAL_MATCHES
      ? getOtherCitiesStreets(city ?? null)
          .filter(({ street }) => street.toLowerCase().includes(streetQuery))
          .slice(0, MAX_OTHER_MATCHES)
          .map(({ city: otherCity, street }) => ({
            label: `г. ${otherCity}, ${street}`,
            value: `г. ${otherCity}, ${street}`,
          }))
      : [];

  const streetMatches = [...localMatches, ...otherMatches];

  const houseMatches = inHouseMode
    ? HOUSE_NUMBERS.filter((n) => n.startsWith(housePrefix)).slice(0, 8)
    : [];

  function selectStreet(street: string) {
    onChange(`${street}${HOUSE_MARKER}`);
    setInvalid(false);
    setOpen(true);
  }

  function selectHouse(number: string) {
    onChange(`${value.slice(0, markerIndex + HOUSE_MARKER.length)}${number}`);
    setInvalid(false);
    setOpen(false);
  }

  function handleBlur() {
    setTimeout(() => {
      setOpen(false);

      if (!value.trim()) {
        setInvalid(false);
        return;
      }

      if (isValidAddress(value, city ?? null)) {
        setInvalid(false);
      } else {
        onChange("");
        setInvalid(true);
      }
    }, 150);
  }

  const showDropdown =
    open && (streetMatches.length > 0 || (inHouseMode && houseMatches.length > 0));

  return (
    <div className="relative">
      <input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setInvalid(false);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={handleBlur}
        placeholder={placeholder}
        autoComplete="off"
        className={inputClassName || DEFAULT_INPUT_CLASSNAME}
      />

      {invalid && !open && (
        <p className="text-red-400 text-xs mt-1.5 px-1">
          Выберите улицу из списка подсказок
        </p>
      )}

      {showDropdown && (
        <div className="absolute z-10 w-full mt-2 bg-[#171726] border border-violet-500/20 rounded-2xl overflow-hidden shadow-xl max-h-72 overflow-y-auto">
          {!inHouseMode &&
            streetMatches.map((match) => (
              <button
                key={match.value}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectStreet(match.value)}
                className="w-full text-left px-4 py-3 hover:bg-violet-600 transition text-sm"
              >
                {match.label}
              </button>
            ))}

          {inHouseMode && (
            <div className="flex flex-wrap gap-1.5 p-2.5">
              {houseMatches.map((number) => (
                <button
                  key={number}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectHouse(number)}
                  className="px-3 py-1.5 rounded-lg bg-[#222233] hover:bg-violet-600 transition text-sm"
                >
                  {number}
                </button>
              ))}

              {houseMatches.length === 0 && (
                <div className="text-xs text-gray-500 px-1.5 py-1">
                  Не нашли номер дома — можно ввести вручную
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
