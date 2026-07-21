"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, User, LogOut, Car, Users } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import Avatar from "@/components/trip/Avatar";
import ThemeToggle from "./ThemeToggle";

const links = [
  { href: "/", text: "Главная" },
  { href: "/search", text: "Межгород" },
  { href: "/taxi", text: "Такси" },
  { href: "/about", text: "О сервисе" },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout, setRole } = useAuth();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    setMenuOpen(false);
    await logout();
    router.refresh();
  }

  async function handleRoleChange(role: "passenger" | "driver") {
    await setRole(role);
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-[#0b0b13]/90 backdrop-blur">
      <div className="max-w-[1400px] mx-auto px-5 lg:px-10 h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 shrink-0">
          <div className="font-display btn-gradient w-11 h-11 rounded-xl flex items-center justify-center font-bold text-lg shrink-0">
            Е
          </div>

          <div>
            <div className="font-display font-bold text-lg leading-tight">
              Едем<span className="text-violet-400">30</span>
            </div>

            <div className="text-xs text-gray-500 leading-tight hidden sm:block">
              По городу и межгороду
            </div>
          </div>
        </Link>

        <nav className="hidden lg:flex items-center gap-9">
          {links.map((link) => {
            const active = pathname === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition ${
                  active
                    ? "text-violet-400"
                    : "text-gray-300 hover:text-white"
                }`}
              >
                {link.text}
              </Link>
            );
          })}
        </nav>

        <div className="hidden lg:flex items-center gap-3">
          <ThemeToggle />

          {loading ? (
            <div className="w-24 h-10 rounded-xl bg-white/5 animate-pulse" />
          ) : user ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2.5 rounded-xl border border-white/10 pl-2 pr-4 py-2 hover:bg-white/5 transition max-w-[220px]"
              >
                <Avatar name={user.name} size={32} tone="violet" />
                <span className="text-sm font-medium truncate min-w-0">{user.name}</span>
              </button>

              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setMenuOpen(false)}
                  />

                  <div className="absolute right-0 top-full mt-2 w-52 bg-[#171726] border border-white/10 rounded-2xl p-1.5 z-40 shadow-xl">
                    {user.role !== "admin" && (
                      <div className="flex bg-[#0f0f18] rounded-xl p-1 mb-1.5">
                        <button
                          onClick={() => handleRoleChange("passenger")}
                          className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition ${
                            user.role === "passenger"
                              ? "bg-violet-600 text-white"
                              : "text-gray-400 hover:text-white"
                          }`}
                        >
                          <Users size={13} />
                          Пассажир
                        </button>

                        <button
                          onClick={() => handleRoleChange("driver")}
                          className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition ${
                            user.role === "driver"
                              ? "bg-violet-600 text-white"
                              : "text-gray-400 hover:text-white"
                          }`}
                        >
                          <Car size={13} />
                          Водитель
                        </button>
                      </div>
                    )}

                    {user.role === "admin" && (
                      <Link
                        href="/eadmin30"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm hover:bg-white/5 transition"
                      >
                        <User size={16} className="text-gray-400" />
                        Админ-панель
                      </Link>
                    )}

                    <Link
                      href="/profile"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm hover:bg-white/5 transition"
                    >
                      <User size={16} className="text-gray-400" />
                      Профиль
                    </Link>

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-white/5 transition"
                    >
                      <LogOut size={16} />
                      Выйти
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="btn-gradient flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition"
            >
              Войти
            </Link>
          )}
        </div>

        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="lg:hidden p-2 -mr-2 text-gray-300"
          aria-label="Меню"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="lg:hidden border-t border-white/5 px-5 py-4">
          <nav className="flex flex-col gap-1">
            {links.map((link) => {
              const active = pathname === link.href;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`px-3 py-3 rounded-xl text-sm font-medium transition ${
                    active
                      ? "bg-violet-600/15 text-violet-400"
                      : "text-gray-300 hover:bg-white/5"
                  }`}
                >
                  {link.text}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center justify-between px-3 mt-3 pt-3 border-t border-white/5">
            <span className="text-sm text-gray-400">Тема</span>
            <ThemeToggle />
          </div>

          <div className="mt-3 pt-3 border-t border-white/5">
            {user ? (
              <div className="px-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar name={user.name} size={32} tone="violet" />
                    <span className="text-sm font-medium truncate min-w-0">{user.name}</span>
                  </div>

                  <button
                    onClick={() => {
                      setMobileOpen(false);
                      handleLogout();
                    }}
                    className="text-sm text-red-400 shrink-0"
                  >
                    Выйти
                  </button>
                </div>

                {user.role !== "admin" ? (
                  <div className="flex bg-[#171726] rounded-xl p-1 mt-3">
                    <button
                      onClick={() => handleRoleChange("passenger")}
                      className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-medium transition ${
                        user.role === "passenger"
                          ? "bg-violet-600 text-white"
                          : "text-gray-400"
                      }`}
                    >
                      <Users size={13} />
                      Пассажир
                    </button>

                    <button
                      onClick={() => handleRoleChange("driver")}
                      className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-medium transition ${
                        user.role === "driver"
                          ? "bg-violet-600 text-white"
                          : "text-gray-400"
                      }`}
                    >
                      <Car size={13} />
                      Водитель
                    </button>
                  </div>
                ) : (
                  <Link
                    href="/eadmin30"
                    onClick={() => setMobileOpen(false)}
                    className="btn-gradient block text-center rounded-xl py-3 text-sm font-medium mt-3"
                  >
                    Админ-панель
                  </Link>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="btn-gradient block text-center rounded-xl py-3 text-sm font-medium"
              >
                Войти
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
