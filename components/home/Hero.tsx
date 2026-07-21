import Image from "next/image";
import Link from "next/link";
import { Bus, Car, ChevronRight } from "lucide-react";

import RoleSwitch from "./RoleSwitch";
import CitySwitch from "./CitySwitch";

type Props = {
  city: string | null;
  onCityChange: (city: string | null) => void;
};

export default function Hero({ city, onCityChange }: Props) {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute -top-40 right-0 w-[600px] h-[600px] bg-violet-600/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-[1400px] mx-auto px-5 sm:px-6 lg:px-10 pt-8 sm:pt-10 lg:pt-14 pb-8 lg:pb-10 relative">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.25fr] gap-10 items-center">
          <div className="relative z-10">
            <CitySwitch city={city} onChange={onCityChange} />

            <h1 className="font-display text-4xl sm:text-5xl font-bold leading-tight mt-4">
              Едем по городу
              <br />
              <span className="text-violet-400">и межгороду</span>
            </h1>

            <p className="text-gray-400 mt-4 sm:mt-5 text-base sm:text-lg max-w-md">
              Быстрый поиск поездок, удобное расписание и заказ такси в одном
              месте.
            </p>

            <div className="mt-7 sm:mt-9">
              <RoleSwitch />
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 max-w-lg">
              <Link
                href="#schedule"
                className="group bg-[#14141f] border border-violet-500/20 rounded-2xl p-3.5 sm:p-5 flex items-center gap-3 sm:gap-4 hover:border-violet-500 transition"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-violet-600/20 flex items-center justify-center shrink-0">
                  <Bus size={20} className="text-violet-400" />
                </div>

                <div className="flex-1 text-left min-w-0">
                  <div className="font-display font-bold text-sm sm:text-base leading-snug">
                    Межгород
                  </div>

                  <div className="text-[11px] sm:text-xs text-gray-500 mt-0.5 leading-snug">
                    Расписание рейсов,
                    <br />
                    поиск попутчиков
                  </div>
                </div>

                <ChevronRight
                  size={18}
                  className="hidden sm:block text-gray-600 group-hover:text-violet-400 transition shrink-0"
                />
              </Link>

              <Link
                href="#taxi"
                className="group bg-[#14141f] border border-violet-500/20 rounded-2xl p-3.5 sm:p-5 flex items-center gap-3 sm:gap-4 hover:border-violet-500 transition"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-violet-600/20 flex items-center justify-center shrink-0">
                  <Car size={20} className="text-violet-400" />
                </div>

                <div className="flex-1 text-left min-w-0">
                  <div className="font-display font-bold text-sm sm:text-base leading-snug">
                    Такси по городу
                  </div>

                  <div className="text-[11px] sm:text-xs text-gray-500 mt-0.5 leading-snug">
                    Быстрый заказ
                    <br />
                    такси онлайн
                  </div>
                </div>

                <ChevronRight
                  size={18}
                  className="hidden sm:block text-gray-600 group-hover:text-violet-400 transition shrink-0"
                />
              </Link>
            </div>
          </div>

          <div className="hidden lg:block relative h-[435px] rounded-[22px] overflow-hidden bg-[#0b0816] shadow-[0_25px_70px_-15px_rgba(139,92,246,0.5)]">
            <Image
              src="/hero-car-city.png"
              alt="Машина Едем30 на фоне города"
              fill
              priority
              sizes="(min-width: 1024px) 45vw, 0px"
              className="object-cover object-[center_40%]"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
