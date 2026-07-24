import type { Metadata } from "next";
import { Car, Wrench } from "lucide-react";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Такси по городу",
  description: "Раздел «Такси по городу» временно в разработке.",
};

export default function TaxiPage() {
  return (
    <main className="min-h-screen bg-[#0b0b13] text-white flex flex-col">
      <Navbar />

      <div className="max-w-[720px] w-full mx-auto px-5 sm:px-6 lg:px-10 py-16 flex-1 flex items-center">
        <div className="w-full bg-[#12121c] border border-white/5 rounded-3xl p-8 sm:p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-violet-600/15 flex items-center justify-center mx-auto mb-5">
            <Wrench size={26} className="text-violet-400" />
          </div>

          <div className="flex items-center justify-center gap-2 font-bold text-2xl sm:text-3xl">
            <Car size={26} className="text-violet-400 shrink-0" />
            Сервис в разработке
          </div>

          <p className="text-gray-400 mt-4 max-w-md mx-auto leading-relaxed">
            Раздел «Такси по городу» временно недоступен — извините за
            неудобство. Мы дорабатываем его, чтобы он полностью соответствовал
            требованиям законодательства. Пока можно воспользоваться разделом
            «Межгород» — поиском попутчиков.
          </p>
        </div>
      </div>

      <Footer />
    </main>
  );
}
