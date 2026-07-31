"use client";

import { useEffect, useState } from "react";
import { Loader2, Search, UserCog, X } from "lucide-react";

type Vehicle = { id: number; label: string; active: boolean };

type Employee = {
  id: number;
  userId: number;
  name: string;
  phone: string | null;
  role: "manager" | "operator" | "driver";
  vehicleId: number | null;
  vehicleLabel: string | null;
  lastSeenAt: string | null;
};

const ROLE_LABELS: Record<Employee["role"], string> = {
  manager: "Менеджер",
  operator: "Оператор",
  driver: "Водитель",
};

function withCarrierId(url: string, carrierId?: number) {
  if (!carrierId) return url;
  return `${url}${url.includes("?") ? "&" : "?"}carrierId=${carrierId}`;
}

function phoneLabel(phone: string | null) {
  return phone ? `+${phone}` : "без телефона";
}

export default function EmployeesTab({
  carrierId,
  vehicles,
  readOnly,
}: {
  carrierId?: number;
  vehicles: Vehicle[];
  readOnly: boolean;
}) {
  const [employees, setEmployees] = useState<Employee[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ id: number; name: string; phone: string | null }[]>([]);
  const [selectedUser, setSelectedUser] = useState<{ id: number; name: string } | null>(null);
  const [role, setRole] = useState<Employee["role"]>("operator");
  const [vehicleId, setVehicleId] = useState<number | "">("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [removingId, setRemovingId] = useState<number | null>(null);

  function load() {
    fetch(withCarrierId("/api/carrier/dashboard/employees", carrierId), { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setEmployees(data.employees ?? []));
  }

  useEffect(load, [carrierId]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    const t = setTimeout(() => {
      fetch(withCarrierId(`/api/carrier/dashboard/employees/search-users?q=${encodeURIComponent(query)}`, carrierId), {
        cache: "no-store",
      })
        .then((res) => res.json())
        .then((data) => setResults(data.users ?? []));
    }, 250);

    return () => clearTimeout(t);
  }, [query, carrierId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUser) return;

    setError("");
    setSaving(true);

    try {
      const res = await fetch(withCarrierId("/api/carrier/dashboard/employees", carrierId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUser.id,
          role,
          vehicleId: role === "driver" && vehicleId ? vehicleId : null,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setError(data?.error ?? "Не удалось назначить сотрудника");
        return;
      }

      setSelectedUser(null);
      setQuery("");
      setRole("operator");
      setVehicleId("");
      setShowForm(false);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function remove(employeeId: number, name: string) {
    if (!confirm(`Отвязать «${name}» от перевозчика?`)) return;

    setRemovingId(employeeId);
    try {
      const res = await fetch(withCarrierId(`/api/carrier/dashboard/employees/${employeeId}`, carrierId), {
        method: "DELETE",
      });
      if (res.ok) load();
    } finally {
      setRemovingId(null);
    }
  }

  if (!employees) {
    return (
      <div className="py-16 flex items-center justify-center text-gray-500">
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2 font-bold text-lg">
          <UserCog size={18} className="text-violet-400" />
          Сотрудники
        </div>

        {!readOnly && (
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="text-sm font-medium text-violet-400 hover:text-violet-300"
          >
            {showForm ? "Отмена" : "+ Назначить"}
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-[#12121c] border border-white/5 rounded-3xl p-5 mb-5 space-y-3">
          {!selectedUser ? (
            <div className="relative">
              <div className="flex items-center gap-2 bg-[#1c1c2b] rounded-xl px-3 py-2.5">
                <Search size={15} className="text-gray-500 shrink-0" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Имя или телефон пользователя Едем30"
                  className="w-full bg-transparent outline-none text-sm"
                />
              </div>

              {results.length > 0 && (
                <div className="mt-2 space-y-1">
                  {results.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => {
                        setSelectedUser({ id: u.id, name: u.name });
                        setResults([]);
                      }}
                      className="w-full text-left bg-[#1c1c2b] hover:bg-white/5 rounded-xl px-3 py-2 text-sm transition"
                    >
                      {u.name} <span className="text-gray-500">({phoneLabel(u.phone)})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2 bg-[#1c1c2b] rounded-xl px-3 py-2.5">
              <span className="text-sm font-medium">{selectedUser.name}</span>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="text-gray-400 hover:text-white transition"
                aria-label="Убрать выбор"
              >
                <X size={14} />
              </button>
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Employee["role"])}
              className="bg-[#1c1c2b] rounded-xl px-3 py-2.5 text-sm outline-none"
            >
              <option value="manager">Менеджер</option>
              <option value="operator">Оператор</option>
              <option value="driver">Водитель</option>
            </select>

            {role === "driver" && (
              <select
                value={vehicleId}
                onChange={(e) => setVehicleId(Number(e.target.value))}
                className="flex-1 min-w-[160px] bg-[#1c1c2b] rounded-xl px-3 py-2.5 text-sm outline-none"
              >
                <option value="">Без машины (назначить позже)</option>
                {vehicles
                  .filter((v) => v.active)
                  .map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label}
                    </option>
                  ))}
              </select>
            )}
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={saving || !selectedUser}
            className="btn-gradient rounded-xl px-5 py-2.5 text-sm font-bold disabled:opacity-60"
          >
            Назначить
          </button>
        </form>
      )}

      <div className="space-y-2">
        {employees.map((emp) => (
          <div
            key={emp.id}
            className="flex items-center justify-between gap-3 bg-[#12121c] border border-white/5 rounded-2xl px-4 py-3"
          >
            <div>
              <div className="font-medium text-sm">{emp.name}</div>
              <div className="text-gray-500 text-xs mt-0.5">
                {ROLE_LABELS[emp.role]}
                {emp.vehicleLabel && ` · ${emp.vehicleLabel}`} · {phoneLabel(emp.phone)}
              </div>
            </div>

            {!readOnly && (
              <button
                type="button"
                onClick={() => remove(emp.id, emp.name)}
                disabled={removingId === emp.id}
                className="text-red-400 hover:text-red-300 text-xs font-medium disabled:opacity-50 shrink-0"
              >
                Отвязать
              </button>
            )}
          </div>
        ))}

        {employees.length === 0 && <div className="text-gray-500 text-sm">Сотрудников ещё нет</div>}
      </div>
    </div>
  );
}
