"use client";

import { ChangeEvent } from "react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

function toRestDigits(value: string) {
  const digits = value.replace(/\D/g, "");
  const withoutCountryCode = digits.startsWith("7") ? digits.slice(1) : digits;
  return withoutCountryCode.slice(0, 10);
}

function formatRest(d: string) {
  let result = "";

  if (d.length > 0) result += "(" + d.slice(0, 3);
  if (d.length >= 3) result += ") ";
  if (d.length > 3) result += d.slice(3, 6);
  if (d.length >= 6) result += "-";
  if (d.length > 6) result += d.slice(6, 8);
  if (d.length >= 8) result += "-";
  if (d.length > 8) result += d.slice(8, 10);

  return result;
}

export default function PhoneInput({ value, onChange, placeholder }: Props) {
  const rest = toRestDigits(value);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
    onChange("+7" + digits);
  }

  return (
    <div className="flex items-center gap-1.5 w-full bg-[#171726] border border-white/5 focus-within:border-violet-500 rounded-2xl px-4 py-4 transition">
      <span className="text-white font-medium select-none shrink-0">+7</span>

      <input
        value={formatRest(rest)}
        onChange={handleChange}
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        placeholder={placeholder ?? "(999) 999-99-99"}
        className="flex-1 min-w-0 bg-transparent outline-none placeholder:text-gray-500"
      />
    </div>
  );
}
