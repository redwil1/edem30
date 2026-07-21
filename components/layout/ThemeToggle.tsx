"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isLight = mounted && resolvedTheme === "light";

  return (
    <button
      type="button"
      onClick={() => setTheme(isLight ? "dark" : "light")}
      className="flex items-center justify-center w-10 h-10 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 transition shrink-0"
      aria-label={isLight ? "Включить тёмную тему" : "Включить светлую тему"}
      title={isLight ? "Тёмная тема" : "Светлая тема"}
    >
      {mounted ? isLight ? <Moon size={17} /> : <Sun size={17} /> : <Sun size={17} />}
    </button>
  );
}
