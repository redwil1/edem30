"use client";

import { useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  Car,
  Star,
  Flag,
  Home,
  ShieldCheck,
  CreditCard,
  Tag,
  Megaphone,
  Settings,
  Menu,
  X,
} from "lucide-react";

import AdminDashboard from "@/components/admin/AdminDashboard";
import AdminUsersTable from "@/components/admin/AdminUsersTable";
import AdminTripsTable from "@/components/admin/AdminTripsTable";
import AdminTaxiOrdersTable from "@/components/admin/AdminTaxiOrdersTable";
import AdminReviewsTable from "@/components/admin/AdminReviewsTable";
import AdminReportsTable from "@/components/admin/AdminReportsTable";
import AdminVerificationsTable from "@/components/admin/AdminVerificationsTable";
import AdminSubscriptionPlansTable from "@/components/admin/AdminSubscriptionPlansTable";
import AdminPromoCodesTable from "@/components/admin/AdminPromoCodesTable";
import AdminNewsletterPanel from "@/components/admin/AdminNewsletterPanel";
import AdminSettingsPanel from "@/components/admin/AdminSettingsPanel";

type Tab =
  | "dashboard"
  | "users"
  | "trips"
  | "taxiOrders"
  | "reports"
  | "reviews"
  | "verifications"
  | "subscriptions"
  | "promoCodes"
  | "newsletter"
  | "settings";

const TABS: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "📊 Дашборд", icon: LayoutDashboard },
  { id: "users", label: "👥 Пользователи", icon: Users },
  { id: "trips", label: "🚗 Поездки", icon: Car },
  { id: "taxiOrders", label: "🚕 Заказы такси", icon: Car },
  { id: "verifications", label: "✅ Верификации", icon: ShieldCheck },
  { id: "reports", label: "💬 Жалобы", icon: Flag },
  { id: "reviews", label: "⭐ Отзывы", icon: Star },
  { id: "subscriptions", label: "💰 Подписки", icon: CreditCard },
  { id: "promoCodes", label: "🎁 Промокоды", icon: Tag },
  { id: "newsletter", label: "📢 Рассылка", icon: Megaphone },
  { id: "settings", label: "⚙ Настройки", icon: Settings },
];

const TAB_LABELS: Record<Tab, string> = Object.fromEntries(
  TABS.map((t) => [t.id, t.label])
) as Record<Tab, string>;

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  function selectTab(id: Tab) {
    setTab(id);
    setMobileNavOpen(false);
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
      <aside className="w-full lg:w-64 shrink-0 lg:sticky lg:top-24">
        <div className="flex items-center justify-between lg:block mb-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition"
          >
            <Home size={15} />
            Главная
          </Link>

          <button
            type="button"
            onClick={() => setMobileNavOpen((v) => !v)}
            className="lg:hidden text-gray-400 hover:text-white transition p-1"
            aria-label="Меню"
          >
            {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <h1 className="hidden lg:block text-2xl font-bold mb-5">Админ-панель</h1>

        <nav
          className={`${mobileNavOpen ? "flex" : "hidden"} lg:flex flex-col gap-1 bg-[#12121c] border border-white/5 rounded-2xl p-2`}
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => selectTab(t.id)}
              className={`flex items-center gap-2.5 text-left px-3.5 py-2.5 rounded-xl text-sm font-medium transition whitespace-nowrap ${
                tab === t.id
                  ? "bg-violet-600 text-white"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <t.icon size={16} className="shrink-0" />
              {t.label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="flex-1 min-w-0 w-full">
        <h2 className="text-xl sm:text-2xl font-bold mb-6 lg:hidden">
          {TAB_LABELS[tab]}
        </h2>

        {tab === "dashboard" && <AdminDashboard />}
        {tab === "users" && <AdminUsersTable />}
        {tab === "trips" && <AdminTripsTable />}
        {tab === "taxiOrders" && <AdminTaxiOrdersTable />}
        {tab === "verifications" && <AdminVerificationsTable />}
        {tab === "reports" && <AdminReportsTable />}
        {tab === "reviews" && <AdminReviewsTable />}
        {tab === "subscriptions" && <AdminSubscriptionPlansTable />}
        {tab === "promoCodes" && <AdminPromoCodesTable />}
        {tab === "newsletter" && <AdminNewsletterPanel />}
        {tab === "settings" && <AdminSettingsPanel />}
      </div>
    </div>
  );
}
