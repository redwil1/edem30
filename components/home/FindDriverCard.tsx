import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";

export default function FindDriverCard() {
  return (
    <div className="bg-[#12121c] border border-white/5 rounded-3xl p-4 sm:p-6">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-9 h-9 rounded-xl bg-violet-600/20 flex items-center justify-center shrink-0">
          <Search size={16} className="text-violet-400" />
        </div>
        <div className="font-display font-bold">Не нашли подходящую поездку?</div>
      </div>

      <p className="text-sm text-gray-400 leading-relaxed mb-4">
        Оставьте заявку «Ищу водителя» — водители, едущие по вашему маршруту,
        сами откликнутся и напишут вам в чат.
      </p>

      <div className="flex items-center gap-4">
        <Link
          href="/find-driver"
          className="bg-violet-600 hover:bg-violet-700 transition rounded-xl px-4 py-2.5 text-sm font-bold"
        >
          Создать заявку
        </Link>

        <Link
          href="/find-driver/mine"
          className="flex items-center gap-1 text-sm text-violet-400 hover:text-violet-300 transition"
        >
          Мои заявки
          <ChevronRight size={14} />
        </Link>
      </div>
    </div>
  );
}
