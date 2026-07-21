"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";
import PassengerTaxiOrder from "@/components/taxi/PassengerTaxiOrder";

export default function TaxiOrderCard() {
  const { user, loading } = useAuth();

  return (
    <div id="taxi" className="scroll-mt-24">
      {loading ? (
        <div className="bg-[#12121c] border border-white/5 rounded-3xl p-8 flex items-center justify-center text-gray-500">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : !user ? (
        <div className="bg-[#12121c] border border-white/5 rounded-3xl p-6 text-center">
          <p className="text-gray-400 mb-5 text-sm">
            Войдите, чтобы заказать такси.
          </p>

          <Link
            href="/login?redirect=/"
            className="inline-block bg-violet-600 hover:bg-violet-700 transition rounded-xl px-6 py-3 font-bold text-sm"
          >
            Войти
          </Link>
        </div>
      ) : (
        <PassengerTaxiOrder />
      )}
    </div>
  );
}
