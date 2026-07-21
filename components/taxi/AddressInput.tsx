"use client";

import { useState } from "react";
import { harabaliStreets } from "@/data/harabaliStreets";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  inputClassName?: string;
};

const HOUSE_MARKER = ", д. ";
const HOUSE_NUMBERS = Array.from({ length: 150 }, (_, i) => String(i + 1));

const DEFAULT_INPUT_CLASSNAME = "w-full bg-[#171726] rounded-2xl p-4 outline-none";

export default function AddressInput({
  value,
  onChange,
  placeholder,
  inputClassName,
}: Props) {
  const [open, setOpen] = useState(false);

  const markerIndex = value.indexOf(HOUSE_MARKER);
  const inHouseMode = markerIndex !== -1;

  const housePrefix = inHouseMode
    ? value.slice(markerIndex + HOUSE_MARKER.length).trim()
    : "";

  const streetQuery = value.trim().toLowerCase();

  const streetMatches =
    !inHouseMode && streetQuery.length > 0
      ? harabaliStreets
          .filter((street) => street.toLowerCase().includes(streetQuery))
          .slice(0, 6)
      : [];

  const houseMatches = inHouseMode
    ? HOUSE_NUMBERS.filter((n) => n.startsWith(housePrefix)).slice(0, 8)
    : [];

  function selectStreet(street: string) {
    onChange(`${street}${HOUSE_MARKER}`);
    setOpen(true);
  }

  function selectHouse(number: string) {
    onChange(`${value.slice(0, markerIndex + HOUSE_MARKER.length)}${number}`);
    setOpen(false);
  }

  const showDropdown =
    open && (streetMatches.length > 0 || (inHouseMode && houseMatches.length > 0));

  return (
    <div className="relative">
      <input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        autoComplete="off"
        className={inputClassName || DEFAULT_INPUT_CLASSNAME}
      />

      {showDropdown && (
        <div className="absolute z-10 w-full mt-2 bg-[#171726] border border-violet-500/20 rounded-2xl overflow-hidden shadow-xl">
          {!inHouseMode &&
            streetMatches.map((street) => (
              <button
                key={street}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectStreet(street)}
                className="w-full text-left px-4 py-3 hover:bg-violet-600 transition text-sm"
              >
                {street}
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
