"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Ban, Check, ExternalLink, EyeOff, Loader2, Package, AlertTriangle, Clock, Flag } from "lucide-react";

import { formatPrice } from "@/lib/utils";
import { categoryLabel } from "@/data/marketplaceCategories";
import { marketplaceReportCategoryLabel } from "@/data/marketplaceReportCategories";

type AdminListing = {
  id: number;
  ownerId: number;
  ownerName: string;
  type: string;
  category: string;
  title: string;
  price: number | null;
  priceType: "fixed" | "negotiable" | "free";
  city: string;
  status: "active" | "reserved" | "sold" | "archived";
  urgent: boolean;
  createdAt: string;
};

type Stats = {
  active: number;
  newToday: number;
  totalReports: number;
  newReports: number;
};

type Report = {
  id: number;
  listingId: number;
  listingTitle: string;
  listingOwnerId: number;
  listingOwnerName: string;
  reporterId: number;
  reporterName: string;
  category: string;
  description: string | null;
  createdAt: string;
  seenAt: string | null;
};

const STATUS_LABELS: Record<AdminListing["status"], string> = {
  active: "Активно",
  reserved: "Забронировано",
  sold: "Продано",
  archived: "Скрыто",
};

export default function AdminMarketplacePanel() {
  const [tab, setTab] = useState<"listings" | "reports">("listings");
  const [listings, setListings] = useState<AdminListing[] | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [reports, setReports] = useState<Report[] | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  async function loadListings() {
    const res = await fetch(
      `/api/admin/marketplace/listings${statusFilter ? `?status=${statusFilter}` : ""}`,
      { cache: "no-store" }
    );
    const data = await res.json();
    setListings(data.listings ?? []);
    setStats(data.stats ?? null);
  }

  async function loadReports() {
    const res = await fetch("/api/admin/marketplace/reports", { cache: "no-store" });
    const data = await res.json();
    setReports(data.reports ?? []);
  }

  useEffect(() => {
    loadListings();
  }, [statusFilter]);

  useEffect(() => {
    if (tab === "reports") loadReports();
  }, [tab]);

  async function hideListing(id: number) {
    if (!confirm("Скрыть это объявление?")) return;

    setBusyId(id);
    await fetch(`/api/admin/marketplace/listings/${id}`, { method: "DELETE" });
    await loadListings();
    setBusyId(null);
  }

  async function markSeen(reportId: number) {
    setBusyId(reportId);
    await fetch(`/api/admin/marketplace/reports/${reportId}`, { method: "POST" });
    await loadReports();
    setBusyId(null);
  }

  async function banUser(userId: number) {
    if (!confirm("Заблокировать этому пользователю публикацию объявлений?")) return;

    setBusyId(userId);
    await fetch(`/api/admin/marketplace/users/${userId}/ban`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ banned: true }),
    });
    setBusyId(null);
  }

  return (
    <div>
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-[#12121c] border border-white/5 rounded-2xl p-4">
            <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-2">
              <Package size={13} />
              Активные
            </div>
            <div className="text-xl font-bold">{stats.active}</div>
          </div>
          <div className="bg-[#12121c] border border-white/5 rounded-2xl p-4">
            <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-2">
              <Clock size={13} />
              Новые за 24ч
            </div>
            <div className="text-xl font-bold">{stats.newToday}</div>
          </div>
          <div className="bg-[#12121c] border border-white/5 rounded-2xl p-4">
            <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-2">
              <Flag size={13} />
              Жалобы всего
            </div>
            <div className="text-xl font-bold">{stats.totalReports}</div>
          </div>
          <div className="bg-[#12121c] border border-amber-500/20 rounded-2xl p-4">
            <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-2">
              <AlertTriangle size={13} />
              Новые жалобы
            </div>
            <div className="text-xl font-bold text-amber-400">{stats.newReports}</div>
          </div>
        </div>
      )}

      <div className="flex bg-[#171726] rounded-2xl p-1 w-fit mb-5">
        <button
          onClick={() => setTab("listings")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
            tab === "listings" ? "bg-violet-600 text-white" : "text-gray-400"
          }`}
        >
          Объявления
        </button>
        <button
          onClick={() => setTab("reports")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
            tab === "reports" ? "bg-violet-600 text-white" : "text-gray-400"
          }`}
        >
          Жалобы
        </button>
      </div>

      {tab === "listings" ? (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-gray-500">Статус:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#12121c] border border-white/5 rounded-xl px-3 py-2 text-sm outline-none"
            >
              <option value="">Все</option>
              <option value="active">Активные</option>
              <option value="reserved">Забронированные</option>
              <option value="sold">Проданные</option>
              <option value="archived">Скрытые</option>
            </select>
          </div>

          {!listings ? (
            <div className="py-16 flex items-center justify-center text-gray-500">
              <Loader2 size={20} className="animate-spin" />
            </div>
          ) : (
            <div className="bg-[#12121c] border border-white/5 rounded-2xl overflow-x-auto">
              <table className="w-full text-sm min-w-[820px]">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-white/5">
                    <th className="px-4 py-3 font-medium">ID</th>
                    <th className="px-4 py-3 font-medium">Объявление</th>
                    <th className="px-4 py-3 font-medium">Категория</th>
                    <th className="px-4 py-3 font-medium">Цена</th>
                    <th className="px-4 py-3 font-medium">Город</th>
                    <th className="px-4 py-3 font-medium">Автор</th>
                    <th className="px-4 py-3 font-medium">Статус</th>
                    <th className="px-4 py-3 font-medium">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {listings.map((l) => (
                    <tr key={l.id} className="border-b border-white/5 last:border-0">
                      <td className="px-4 py-3 text-gray-500">{l.id}</td>
                      <td className="px-4 py-3 max-w-[220px]">
                        <Link
                          href={`/marketplace/${l.id}`}
                          target="_blank"
                          className="flex items-center gap-1.5 text-violet-400 hover:text-violet-300 transition truncate"
                        >
                          <span className="truncate">{l.title}</span>
                          <ExternalLink size={12} className="shrink-0" />
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                        {categoryLabel(l.category)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {l.priceType === "free" ? "Бесплатно" : formatPrice(l.price ?? 0)}
                      </td>
                      <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{l.city}</td>
                      <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{l.ownerName}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-white/5 whitespace-nowrap">
                          {STATUS_LABELS[l.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {l.status !== "archived" && (
                          <button
                            onClick={() => hideListing(l.id)}
                            disabled={busyId === l.id}
                            className="text-gray-400 hover:text-red-400 disabled:opacity-60"
                            title="Скрыть объявление"
                          >
                            <EyeOff size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}

                  {listings.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-gray-500">
                        Объявлений нет
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div>
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
                    <th className="px-4 py-3 font-medium">Причина</th>
                    <th className="px-4 py-3 font-medium">Описание</th>
                    <th className="px-4 py-3 font-medium">Объявление</th>
                    <th className="px-4 py-3 font-medium">Автор объявления</th>
                    <th className="px-4 py-3 font-medium">Пожаловался</th>
                    <th className="px-4 py-3 font-medium">Статус</th>
                    <th className="px-4 py-3 font-medium">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r) => (
                    <tr key={r.id} className="border-b border-white/5 last:border-0">
                      <td className="px-4 py-3 text-gray-500">{r.id}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {marketplaceReportCategoryLabel(r.category)}
                      </td>
                      <td className="px-4 py-3 text-gray-400 max-w-[220px] truncate">
                        {r.description || "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Link
                          href={`/marketplace/${r.listingId}`}
                          target="_blank"
                          className="flex items-center gap-1.5 text-violet-400 hover:text-violet-300 transition"
                        >
                          {r.listingTitle}
                          <ExternalLink size={12} />
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{r.listingOwnerName}</td>
                      <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{r.reporterName}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${
                            r.seenAt ? "bg-green-500/10 text-green-400" : "bg-yellow-500/10 text-yellow-400"
                          }`}
                        >
                          {r.seenAt ? "Рассмотрена" : "Новая"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {!r.seenAt && (
                            <button
                              onClick={() => markSeen(r.id)}
                              disabled={busyId === r.id}
                              className="text-green-400 hover:text-green-300 disabled:opacity-60"
                              title="Отметить рассмотренной"
                            >
                              <Check size={16} />
                            </button>
                          )}
                          <button
                            onClick={() => hideListing(r.listingId)}
                            disabled={busyId === r.listingId}
                            className="text-gray-400 hover:text-red-400 disabled:opacity-60"
                            title="Скрыть объявление"
                          >
                            <EyeOff size={16} />
                          </button>
                          <button
                            onClick={() => banUser(r.listingOwnerId)}
                            disabled={busyId === r.listingOwnerId}
                            className="text-gray-400 hover:text-red-400 disabled:opacity-60"
                            title="Запретить автору публиковать объявления"
                          >
                            <Ban size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {reports.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-gray-500">
                        Жалоб нет
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
