"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, Bus, Car, User } from "lucide-react";

const items = [
  { href: "/", icon: House, text: "Главная" },
  { href: "/search", icon: Bus, text: "Межгород" },
  { href: "/taxi", icon: Car, text: "Такси" },
  { href: "/profile", icon: User, text: "Профиль" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#171726]/95 backdrop-blur border-t border-violet-500/10">
      <div className="max-w-md mx-auto flex justify-around py-2.5">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-4 py-1.5 text-xs transition ${
                active ? "text-violet-400" : "text-gray-500"
              }`}
            >
              <Icon size={20} />
              {item.text}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
