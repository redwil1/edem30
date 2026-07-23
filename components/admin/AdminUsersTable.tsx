"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Ban,
  Check,
  CheckCircle2,
  Copy,
  KeyRound,
  Loader2,
  Search,
  Trash2,
  X,
} from "lucide-react";

type Role = "passenger" | "driver" | "admin";
type Filter = "all" | "driver" | "passenger" | "blocked" | "noname";

type User = {
  id: number;
  name: string;
  phone: string;
  role: Role;
  createdAt: string;
  reportsAgainst: number;
  isBlocked: boolean;
};

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "Все" },
  { value: "driver", label: "Только водители" },
  { value: "passenger", label: "Только пассажиры" },
  { value: "blocked", label: "Заблокированные" },
  { value: "noname", label: "Без имени" },
];

function riskBadge(count: number) {
  if (count === 0) return null;

  if (count >= 3) {
    return { label: `${count} жалоб`, className: "bg-red-500/15 text-red-400" };
  }

  return { label: `${count} жалоб${count === 1 ? "а" : "ы"}`, className: "bg-yellow-500/15 text-yellow-300" };
}

const ROLE_LABELS: Record<Role, string> = {
  passenger: "Пассажир",
  driver: "Водитель",
  admin: "Админ",
};

export default function AdminUsersTable() {
  const [users, setUsers] = useState<User[] | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [savingId, setSavingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [resettingId, setResettingId] = useState<number | null>(null);
  const [blockingId, setBlockingId] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState<{ user: User; password: string } | null>(
    null
  );
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!newPassword) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setNewPassword(null);
    }

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [newPassword]);

  async function load(query: string, activeFilter: Filter) {
    const params = new URLSearchParams();
    if (query) params.set("search", query);
    if (activeFilter !== "all") params.set("filter", activeFilter);

    const res = await fetch(`/api/admin/users?${params.toString()}`, {
      cache: "no-store",
    });
    const data = await res.json();
    setUsers(data.users ?? []);
  }

  useEffect(() => {
    load(search, filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function changeRole(userId: number, role: Role) {
    setSavingId(userId);

    await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });

    await load(search, filter);
    setSavingId(null);
  }

  async function deleteUser(user: User) {
    if (
      !confirm(
        `Удалить пользователя «${user.name}» (+${user.phone})? Будут безвозвратно удалены его поездки, сообщения в чатах, заказы такси и отзывы.`
      )
    ) {
      return;
    }

    setError("");
    setDeletingId(user.id);

    try {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error || "Не удалось удалить пользователя");
        return;
      }

      await load(search, filter);
    } finally {
      setDeletingId(null);
    }
  }

  async function resetPassword(user: User) {
    if (!confirm(`Сбросить пароль пользователя «${user.name}»? Старый пароль перестанет работать.`)) {
      return;
    }

    setError("");
    setResettingId(user.id);

    try {
      const res = await fetch(`/api/admin/users/${user.id}/reset-password`, {
        method: "POST",
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error || "Не удалось сбросить пароль");
        return;
      }

      setNewPassword({ user, password: data.password });
      setCopied(false);
    } finally {
      setResettingId(null);
    }
  }

  async function toggleBlock(user: User) {
    const nextBlocked = !user.isBlocked;

    if (
      nextBlocked &&
      !confirm(`Заблокировать пользователя «${user.name}» (+${user.phone})?`)
    ) {
      return;
    }

    setError("");
    setBlockingId(user.id);

    try {
      const res = await fetch(`/api/admin/users/${user.id}/block`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocked: nextBlocked }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error || "Не удалось изменить статус пользователя");
        return;
      }

      await load(search, filter);
    } finally {
      setBlockingId(null);
    }
  }

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          load(search, filter);
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

      <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={`whitespace-nowrap rounded-xl px-3.5 py-2 text-xs font-medium transition ${
              filter === f.value
                ? "bg-violet-600 text-white"
                : "bg-[#12121c] border border-white/5 text-gray-400 hover:text-white"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

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
                <th className="px-4 py-3 font-medium">Статус</th>
                <th className="px-4 py-3 font-medium">Дата</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>

            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-3 text-gray-500">{u.id}</td>
                  <td className="px-4 py-3 font-medium">
                    <div className="flex items-center gap-2">
                      {u.name}

                      {riskBadge(u.reportsAgainst) && (
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap ${riskBadge(u.reportsAgainst)!.className}`}
                          title="Количество жалоб на этого пользователя"
                        >
                          <AlertTriangle size={10} />
                          {riskBadge(u.reportsAgainst)!.label}
                        </span>
                      )}
                    </div>
                  </td>
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
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full whitespace-nowrap ${
                        u.isBlocked
                          ? "bg-red-500/15 text-red-400"
                          : "bg-green-500/15 text-green-400"
                      }`}
                    >
                      {u.isBlocked ? <Ban size={10} /> : <CheckCircle2 size={10} />}
                      {u.isBlocked ? "Заблокирован" : "Активен"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {u.createdAt}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => toggleBlock(u)}
                      disabled={blockingId === u.id || u.role === "admin"}
                      title={
                        u.role === "admin"
                          ? "Нельзя заблокировать администратора"
                          : u.isBlocked
                          ? "Разблокировать"
                          : "Заблокировать"
                      }
                      className={`inline-flex items-center justify-center w-8 h-8 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition ${
                        u.isBlocked
                          ? "text-green-400 hover:bg-green-500/10"
                          : "text-yellow-400 hover:bg-yellow-500/10"
                      }`}
                    >
                      {blockingId === u.id ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : u.isBlocked ? (
                        <CheckCircle2 size={15} />
                      ) : (
                        <Ban size={15} />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => resetPassword(u)}
                      disabled={resettingId === u.id}
                      title="Сбросить пароль"
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-violet-400 hover:bg-violet-500/10 disabled:opacity-30 transition"
                    >
                      {resettingId === u.id ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <KeyRound size={15} />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteUser(u)}
                      disabled={deletingId === u.id || u.role === "admin"}
                      title={
                        u.role === "admin"
                          ? "Нельзя удалить администратора"
                          : "Удалить пользователя"
                      }
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-red-400 hover:bg-red-500/10 disabled:opacity-30 disabled:hover:bg-transparent transition"
                    >
                      {deletingId === u.id ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <Trash2 size={15} />
                      )}
                    </button>
                  </td>
                </tr>
              ))}

              {users.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-500">
                    Никого не найдено
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {error && <p className="text-red-400 text-sm mt-3">{error}</p>}

      {newPassword && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-5"
          onClick={() => setNewPassword(null)}
        >
          <div
            className="bg-[#171726] border border-white/10 rounded-3xl p-6 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="font-display font-bold">Новый пароль</div>

              <button
                type="button"
                onClick={() => setNewPassword(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-white/5 transition"
                aria-label="Закрыть"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-sm text-gray-500 mb-4">
              Для «{newPassword.user.name}» (+{newPassword.user.phone}). Сообщите
              его пользователю — повторно посмотреть будет нельзя.
            </p>

            <div className="flex items-center gap-2 bg-[#1c1c2b] rounded-xl px-4 py-3">
              <span className="font-mono text-lg flex-1 tracking-wide">
                {newPassword.password}
              </span>

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(newPassword.password);
                  setCopied(true);
                }}
                className="text-gray-400 hover:text-white transition shrink-0"
                aria-label="Скопировать"
              >
                {copied ? (
                  <Check size={16} className="text-green-400" />
                ) : (
                  <Copy size={16} />
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setNewPassword(null)}
              className="btn-gradient w-full mt-5 rounded-xl py-3 text-sm font-bold"
            >
              Готово
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
