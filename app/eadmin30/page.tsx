"use client";

import { useState } from "react";
import { LayoutDashboard, Users, Car, Star, Flag, ShieldCheck } from "lucide-react";

import AdminDashboard from "@/components/admin/AdminDashboard";
import AdminUsersTable from "@/components/admin/AdminUsersTable";
import AdminTripsTable from "@/components/admin/AdminTripsTable";
import AdminReviewsTable from "@/components/admin/AdminReviewsTable";
import AdminReportsTable from "@/components/admin/AdminReportsTable";
import AdminVerificationsTable from "@/components/admin/AdminVerificationsTable";

type Tab = "dashboard" | "users" | "trips" | "reviews" | "reports" | "verifications";

const TABS: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "📊 Дашборд", icon: LayoutDashboard },
  { id: "users", label: "👥 Пользователи", icon: Users },
  { id: "trips", label: "🚗 Поездки", icon: Car },
  { id: "reviews", label: "⭐ Отзывы", icon: Star },
  { id: "reports", label: "🚩 Жалобы", icon: Flag },
  { id: "verifications", label: "🛡 Верификация", icon: ShieldCheck },
];

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("dashboard");

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">Админ-панель</h1>

      <div className="flex gap-1 bg-[#12121c] border border-white/5 rounded-2xl p-1 mb-6 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 whitespace-nowrap px-4 py-2.5 rounded-xl text-sm font-medium transition ${
              tab === t.id
                ? "bg-violet-600 text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "dashboard" && <AdminDashboard />}
      {tab === "users" && <AdminUsersTable />}
      {tab === "trips" && <AdminTripsTable />}
      {tab === "reviews" && <AdminReviewsTable />}
      {tab === "reports" && <AdminReportsTable />}
      {tab === "verifications" && <AdminVerificationsTable />}
    </div>
  );
}
