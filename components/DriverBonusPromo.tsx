import Link from "next/link";
import { Flame } from "lucide-react";

/**
 * Компактный промо-блок акции "+50 ₽ водителю за пассажира" — только на
 * странице межгорода, между поиском и списком поездок. Никакой новой
 * бизнес-логики/БД — просто ссылка на условия в существующем FAQ.
 */
export default function DriverBonusPromo() {
  return (
    <div className="bg-[#171726] border border-amber-500/20 rounded-3xl p-4 sm:p-5 mt-8">
      <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold mb-2">
        <Flame size={14} />
        Для водителей
      </div>

      <div className="font-bold leading-snug">
        Водителям — <span className="text-amber-400">+50 ₽</span> за каждого пассажира
      </div>

      <p className="text-sm text-gray-400 mt-1.5 leading-snug">
        Опубликуйте поездку на Едем30 и получите бонус за каждого пассажира, который поедет с вами.
      </p>

      <Link
        href="/faq"
        className="btn-gradient inline-block mt-3 rounded-xl px-5 py-2.5 text-sm font-bold text-center"
      >
        Узнать об акции
      </Link>
    </div>
  );
}
