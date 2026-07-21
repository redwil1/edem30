"use client";

import { useState } from "react";
import { MapPin, ChevronDown } from "lucide-react";

import CityModal from "@/components/CityModal";

type Props = {
  city: string | null;
  onChange: (city: string | null) => void;
};

export default function CitySwitch({ city, onChange }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-sm text-gray-300 hover:text-white transition bg-[#14141f] border border-violet-500/20 rounded-xl px-3.5 py-2"
      >
        <MapPin size={14} className="text-violet-400 shrink-0" />
        {city ?? "Выбрать город"}
        <ChevronDown size={14} className="text-gray-500 shrink-0" />
      </button>

      <CityModal
        open={open}
        onClose={() => setOpen(false)}
        onSelect={(selected) => onChange(selected)}
      />
    </>
  );
}
