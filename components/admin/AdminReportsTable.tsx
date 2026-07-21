"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Check, ExternalLink } from "lucide-react";

import { reportCategoryLabel } from "@/lib/reportCategories";

type Status = "new" | "resolved";

type Report = {
  id: number;
  category: string;
  description: string | null;
  status: Status;
  reporterName: string;
  tripId: number;
  tripRoute: string;
  createdAt: string;
};

const STATUS_LABELS: Record<Status, string> = {
  new: "Новая",
  resolved: "Решена",
};

const STATUS_STYLES: Record<Status, string> = {
  new: "bg-yellow-500/10 text-yellow-400",
  resolved: "bg-green-500/10 text-green-400",
};

export default function AdminReportsTable() {
  const [reports, setReports] = useState<Report[] | null>(null);
  const [filter, setFilter] = useState<"" | Status>("new");
  const [busyId, setBusyId] = useState<number | null>(null);

  async function load(status: "" | Status) {
    const res = await fetch(
      `/api/admin/reports${status ? `?status=${status}` : ""}`,
      { cache: "no-store" }
    );
    const data = await res.json();
    setReports(data.reports ?? []);
  }

  useEffect(() => {
    load(filter);

    const interval = setInterval(() => load(filter), 5000);

    return () => clearInterval(interval);
  }, [filter]);

  async function resolve(reportId: number) {
    setBusyId(reportId);

    await fetch(`/api/admin/reports/${reportId}`, { method: "PATCH" });

    await load(filter);
    setBusyId(null);
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-5">
        <span className="text-sm text-gray-500">Статус:</span>

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as "" | Status)}
          className="bg-[#12121c] border border-white/5 rounded-xl px-3 py-2 text-sm outline-none"
        >
          <option value="new">Новые</option>
          <option value="resolved">Решённые</option>
          <option value="">Все</option>
        </select>
      </div>

      {!reports ? (
        <div className="py-16 flex items-center justify-center text-gray-500">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : (
        <div className="bg-[#12121c] border border-white/5 rounded-2xl overflow-x-auto">
          <table className="w-full text-sm min-w-[820px]">
            <thead>
              <tr className="text-left text-gray-500 border-b border-white/5">
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">Категория</th>
                <th className="px-4 py-3 font-medium">Описание</th>
                <th className="px-4 py-3 font-medium">Поездка</th>
                <th className="px-4 py-3 font-medium">Автор</th>
                <th className="px-4 py-3 font-medium">Статус</th>
                <th className="px-4 py-3 font-medium">Действия</th>
              </tr>
            </thead>

            <tbody>
              {reports.map((r) => (
                <tr key={r.id} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-3 text-gray-500">{r.id}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {reportCategoryLabel(r.category)}
                  </td>
                  <td className="px-4 py-3 text-gray-400 max-w-[280px] truncate">
                    {r.description || "—"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Link
                      href={`/trip/${r.tripId}`}
                      target="_blank"
                      className="flex items-center gap-1.5 text-violet-400 hover:text-violet-300 transition"
                    >
                      {r.tripRoute}
                      <ExternalLink size={12} />
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                    {r.reporterName}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${STATUS_STYLES[r.status]}`}
                    >
                      {STATUS_LABELS[r.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {r.status === "new" && (
                      <button
                        onClick={() => resolve(r.id)}
                        disabled={busyId === r.id}
                        className="text-green-400 hover:text-green-300 disabled:opacity-60"
                        title="Отметить решённой"
                      >
                        <Check size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}

              {reports.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-500">
                    Жалоб нет
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
