"use client";

import { useState } from "react";
import Link from "next/link";
import { PhoneCall, ShieldCheck, TriangleAlert } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import ReportModal from "./ReportModal";

type Props = {
  tripId: number;
};

export default function SafetyCard({ tripId }: Props) {
  const { user } = useAuth();
  const [reportOpen, setReportOpen] = useState(false);

  return (
    <div className="bg-[#12121c] border border-white/5 rounded-3xl p-4 sm:p-6">
      <div className="font-display flex items-center gap-2 font-bold mb-3">
        <ShieldCheck size={18} className="text-violet-400" />
        Ваша безопасность
      </div>

      <p className="text-sm text-gray-500 leading-relaxed">
        Мы не передаём ваши контакты другим участникам поездки — общайтесь
        через чат поездки.
      </p>

      <a
        href="tel:112"
        className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 transition rounded-xl py-3 mt-4 text-sm font-bold"
      >
        <PhoneCall size={16} />
        SOS — вызвать 112
      </a>

      <div className="flex gap-2.5 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 mt-4">
        <TriangleAlert
          size={16}
          className="text-yellow-400 shrink-0 mt-0.5"
        />

        <p className="text-xs text-yellow-200/80 leading-relaxed">
          Никогда не сообщайте в чате номер карты, код из СМС, паспортные
          данные или номер телефона. Оплата — только наличными водителю при
          посадке.
        </p>
      </div>

      {user ? (
        <button
          onClick={() => setReportOpen(true)}
          className="text-sm text-violet-400 hover:text-violet-300 transition mt-4"
        >
          Пожаловаться на поездку
        </button>
      ) : (
        <Link
          href={`/login?redirect=/trip/${tripId}`}
          className="block text-sm text-violet-400 hover:text-violet-300 transition mt-4"
        >
          Войдите, чтобы пожаловаться на поездку
        </Link>
      )}

      <ReportModal
        tripId={tripId}
        open={reportOpen}
        onClose={() => setReportOpen(false)}
      />
    </div>
  );
}
