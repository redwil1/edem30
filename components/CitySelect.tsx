"use client";

import { useState } from "react";
import { cities } from "@/lib/cities";

type Props = {
  placeholder: string;
};

export default function CitySelect({ placeholder }: Props) {
  const [value, setValue] = useState("");

  const filtered = cities.filter((city) =>
    city.toLowerCase().includes(value.toLowerCase()),
  );

  return (
    <div className="relative mb-4">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[#222233] rounded-xl p-4 outline-none"
      />

      {value.length > 0 && (
        <div className="absolute w-full mt-2 bg-[#171726] rounded-2xl max-h-60 overflow-auto border border-violet-500/20">
          {filtered.map((city) => (
            <button
              key={city}
              onClick={() => setValue(city)}
              className="w-full text-left px-4 py-3 hover:bg-violet-600 transition"
            >
              {city}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
