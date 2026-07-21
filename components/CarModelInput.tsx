"use client";

import { useState } from "react";
import { carModels } from "@/lib/carModels";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
};

export default function CarModelInput({ value, onChange, placeholder }: Props) {
  const [open, setOpen] = useState(false);

  const query = value.trim().toLowerCase();

  const matches =
    query.length > 0
      ? carModels.filter((m) => m.toLowerCase().includes(query)).slice(0, 8)
      : [];

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
        className="w-full bg-[#171726] border border-white/10 focus:border-violet-500 rounded-2xl p-4 outline-none transition"
      />

      {open && matches.length > 0 && (
        <div className="absolute z-10 w-full mt-2 bg-[#171726] border border-violet-500/20 rounded-2xl overflow-hidden shadow-xl">
          {matches.map((m) => (
            <button
              key={m}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(m);
                setOpen(false);
              }}
              className="w-full text-left px-4 py-3 hover:bg-violet-600 transition text-sm"
            >
              {m}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
