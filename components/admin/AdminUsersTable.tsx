"use client";

import { useEffect, useState } from "react";
import { Loader2, Search } from "lucide-react";

type Role = "passenger" | "driver" | "admin";

type User = {
  id: number;
  name: string;
  phone: string;
  role: Role;
  createdAt: string;
};

const ROLE_LABELS: Record<Role, string> = {
  passenger: "Пассажир",
  driver: "Водитель",
  admin: "Админ",
};

export default function AdminUsersTable() {
  const [users, setUsers] = useState<User[] | null>(null);
  const [search, setSearch] = useState("");
  const [savingId, setSavingId] = useState<number | null>(null);

  async function load(query: string) {
    const res = await fetch(
      `/api/admin/users${query ? `?search=${encodeURIComponent(query)}` : ""}`,
      { cache: "no-store" }
    );
    const data = await res.json();
    setUsers(data.users ?? []);
  }

  useEffect(() => {
    load("");
  }, []);

  async function changeRole(userId: number, role: Role) {
    setSavingId(userId);

    await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });

    await load(search);
    setSavingId(null);
  }

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          load(search);
        }}
        className="flex items-center gap-2 bg-[#12121c] border border-white/5 rounded-2xl px-4 py-2.5 mb-5 max-w-sm"
      >
        <Search size={16} className="text-gray-500 shrink-0" />

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по имени"
          className="w-full bg-transparent outline-none text-sm placeholder:text-gray-500"
        />
      </form>

      {!users ? (
        <div className="py-16 flex items-center justify-center text-gray-500">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : (
        <div className="bg-[#12121c] border border-white/5 rounded-2xl overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="text-left text-gray-500 border-b border-white/5">
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Имя</th>
                <th className="px-4 py-3 font-medium">Телефон</th>
                <th className="px-4 py-3 font-medium">Роль</th>
                <th className="px-4 py-3 font-medium">Дата</th>
              </tr>
            </thead>

            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-3 text-gray-500">{u.id}</td>
                  <td className="px-4 py-3 font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-gray-400">+{u.phone}</td>
                  <td className="px-4 py-3">
                    <select
                      value={u.role}
                      disabled={savingId === u.id}
                      onChange={(e) => changeRole(u.id, e.target.value as Role)}
                      className="bg-[#1c1c2b] rounded-lg px-2.5 py-1.5 outline-none disabled:opacity-60"
                    >
                      {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {u.createdAt}
                  </td>
                </tr>
              ))}

              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-gray-500">
                    Никого не найдено
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
