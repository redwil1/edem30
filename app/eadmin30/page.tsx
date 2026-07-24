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
  MessageCircle,
  Send,
  Menu,
  X,
  TrendingUp,
} from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import AdminDashboard from "@/components/admin/AdminDashboard";
import AdminUsersTable from "@/components/admin/AdminUsersTable";
import AdminTripsTable from "@/components/admin/AdminTripsTable";
import AdminTaxiOrdersTable from "@/components/admin/AdminTaxiOrdersTable";
import AdminReviewsTable from "@/components/admin/AdminReviewsTable";
import AdminReportsTable from "@/components/admin/AdminReportsTable";
import AdminVerificationsTable from "@/components/admin/AdminVerificationsTable";
import AdminChatModeration from "@/components/admin/AdminChatModeration";
import AdminTelegramMessagesTable from "@/components/admin/AdminTelegramMessagesTable";
import AdminSubscriptionPlansTable from "@/components/admin/AdminSubscriptionPlansTable";
import AdminPromoCodesTable from "@/components/admin/AdminPromoCodesTable";
import AdminNewsletterPanel from "@/components/admin/AdminNewsletterPanel";
import AdminSettingsPanel from "@/components/admin/AdminSettingsPanel";
import AdminMarketing from "@/components/admin/AdminMarketing";

type Tab =
  | "dashboard"
  | "users"
  | "trips"
  | "taxiOrders"
  | "chats"
  | "telegram"
  | "reports"
  | "reviews"
  | "verifications"
  | "marketing"
  | "subscriptions"
  | "promoCodes"
  | "newsletter"
  | "settings";

const ADMIN_ONLY_TABS: Tab[] = ["marketing", "subscriptions", "promoCodes", "newsletter", "settings"];

const TABS: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "📊 Дашборд", icon: LayoutDashboard },
  { id: "users", label: "👥 Пользователи", icon: Users },
  { id: "trips", label: "🚗 Поездки", icon: Car },
  { id: "taxiOrders", label: "🚕 Заказы такси", icon: Car },
  { id: "chats", label: "💬 Чаты", icon: MessageCircle },
  { id: "telegram", label: "✈ Telegram", icon: Send },
  { id: "verifications", label: "✅ Верификации", icon: ShieldCheck },
  { id: "reports", label: "🚩 Жалобы", icon: Flag },
  { id: "reviews", label: "⭐ Отзывы", icon: Star },
  { id: "marketing", label: "📈 Маркетинг", icon: TrendingUp },
  { id: "subscriptions", label: "💰 Подписки", icon: CreditCard },
  { id: "promoCodes", label: "🎁 Промокоды", icon: Tag },
  { id: "newsletter", label: "📢 Рассылка", icon: Megaphone },
  { id: "settings", label: "⚙ Настройки", icon: Settings },
];

const TAB_LABELS: Record<Tab, string> = Object.fromEntries(
  TABS.map((t) => [t.id, t.label])
) as Record<Tab, string>;

export default function AdminPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const visibleTabs = TABS.filter((t) => isAdmin || !ADMIN_ONLY_TABS.includes(t.id));

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

        <h1 className="hidden lg:block text-2xl font-bold mb-1">Админ-панель</h1>
        {!isAdmin && (
          <p className="hidden lg:block text-xs text-gray-500 mb-4">Режим модератора</p>
        )}

        <nav
          className={`${mobileNavOpen ? "flex" : "hidden"} lg:flex flex-col gap-1 bg-[#12121c] border border-white/5 rounded-2xl p-2 mt-4 lg:mt-0`}
        >
          {visibleTabs.map((t) => (
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
        {tab === "chats" && <AdminChatModeration />}
        {tab === "telegram" && <AdminTelegramMessagesTable />}
        {tab === "verifications" && <AdminVerificationsTable />}
        {tab === "reports" && <AdminReportsTable />}
        {tab === "reviews" && <AdminReviewsTable />}
        {isAdmin && tab === "marketing" && <AdminMarketing />}
        {isAdmin && tab === "subscriptions" && <AdminSubscriptionPlansTable />}
        {isAdmin && tab === "promoCodes" && <AdminPromoCodesTable />}
        {isAdmin && tab === "newsletter" && <AdminNewsletterPanel />}
        {isAdmin && tab === "settings" && <AdminSettingsPanel />}
      </div>
    </div>
  );
}
