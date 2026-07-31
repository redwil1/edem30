import Link from "next/link";
import { Car } from "lucide-react";

export default function BecomeDriverCard() {
  return (
    <div className="bg-[#12121c] border border-white/5 rounded-3xl p-4 sm:p-6">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-9 h-9 rounded-xl bg-violet-600/20 flex items-center justify-center shrink-0">
          <Car size={16} className="text-violet-400" />
        </div>
        <div className="font-display font-bold">Едете сами? Возьмите попутчиков</div>
      </div>

      <p className="text-sm text-gray-400 leading-relaxed mb-4">
        Опубликуйте свою поездку за пару минут — укажите маршрут, время и
        цену за место. Как только найдутся попутчики, вы увидите их заявки
        и будете общаться в чате поездки.
      </p>

      <Link
        href="/create-trip"
        className="inline-block bg-violet-600 hover:bg-violet-700 transition rounded-xl px-4 py-2.5 text-sm font-bold"
      >
        Опубликовать поездку
      </Link>
    </div>
  );
}
