"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "edem30_city";

export function useSelectedCity() {
  const [city, setCity] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setCity(stored);
  }, []);

  function updateCity(next: string | null) {
    setCity(next);

    if (next) {
      localStorage.setItem(STORAGE_KEY, next);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  return [city, updateCity] as const;
}
