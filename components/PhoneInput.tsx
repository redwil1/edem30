"use client";

import { ChangeEvent, useLayoutEffect, useRef } from "react";

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

// Позиция в отформатированной строке, до которой стоит ровно `digitCount` цифр.
function positionForDigitCount(formatted: string, digitCount: number) {
  if (digitCount <= 0) return 0;

  let seen = 0;

  for (let i = 0; i < formatted.length; i++) {
    if (/\d/.test(formatted[i])) {
      seen++;
      if (seen === digitCount) return i + 1;
    }
  }

  return formatted.length;
}

export default function PhoneInput({ value, onChange, placeholder }: Props) {
  const rest = toRestDigits(value);
  const formatted = formatRest(rest);

  const inputRef = useRef<HTMLInputElement>(null);
  const pendingCursorDigits = useRef<number | null>(null);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    const cursorPos = e.target.selectionStart ?? raw.length;

    pendingCursorDigits.current = raw.slice(0, cursorPos).replace(/\D/g, "").length;

    const digits = raw.replace(/\D/g, "").slice(0, 10);
    onChange("+7" + digits);
  }

  useLayoutEffect(() => {
    if (pendingCursorDigits.current === null) return;

    const pos = positionForDigitCount(formatted, pendingCursorDigits.current);
    pendingCursorDigits.current = null;

    inputRef.current?.setSelectionRange(pos, pos);
  }, [formatted]);

  return (
    <div className="flex items-center gap-1.5 w-full bg-[#171726] border border-white/5 focus-within:border-violet-500 rounded-2xl px-4 py-4 transition">
      <span className="text-white font-medium select-none shrink-0">+7</span>

      <input
        ref={inputRef}
        value={formatted}
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
