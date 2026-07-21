import Link from "next/link";
import { Bus, Car, ChevronRight } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute -top-40 right-0 w-[600px] h-[600px] bg-violet-600/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-[1400px] mx-auto px-5 sm:px-6 lg:px-10 pt-8 sm:pt-10 lg:pt-14 pb-8 lg:pb-10 relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <h1 className="text-4xl sm:text-5xl font-bold leading-tight">
              Едем по городу
              <br />
              <span className="text-violet-400">и межгороду</span>
            </h1>

            <p className="text-gray-400 mt-4 sm:mt-5 text-base sm:text-lg max-w-md">
              Быстрый поиск поездок, удобное расписание и заказ такси в одном
              месте.
            </p>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-7 sm:mt-9 max-w-lg">
              <Link
                href="#schedule"
                className="group bg-[#14141f] border border-violet-500/20 rounded-2xl p-3.5 sm:p-5 flex items-center gap-3 sm:gap-4 hover:border-violet-500 transition"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-violet-600/20 flex items-center justify-center shrink-0">
                  <Bus size={20} className="text-violet-400" />
                </div>

                <div className="flex-1 text-left min-w-0">
                  <div className="font-bold text-sm sm:text-base leading-snug">
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
                  <div className="font-bold text-sm sm:text-base leading-snug">
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

          <div className="hidden lg:flex justify-center items-center">
            <CarIllustration />
          </div>
        </div>
      </div>
    </section>
  );
}

function CarIllustration() {
  return (
    <svg
      viewBox="0 0 520 300"
      className="w-full max-w-xl drop-shadow-[0_0_60px_rgba(124,58,237,0.35)]"
      fill="none"
    >
      <ellipse cx="260" cy="255" rx="190" ry="18" fill="#7c3aed" opacity="0.15" />

      <path
        d="M60 190 C60 150 90 120 140 112 L175 80 C190 66 210 58 232 58 L318 58 C342 58 364 68 380 86 L404 112 C440 118 468 140 470 172 L470 200 C470 210 462 218 452 218 L82 218 C70 218 60 210 60 198 Z"
        fill="#101018"
        stroke="#7c3aed"
        strokeOpacity="0.5"
        strokeWidth="2"
      />

      <path
        d="M182 108 L205 82 C214 72 227 66 240 66 L305 66 C320 66 334 72 344 83 L366 108 Z"
        fill="#1c1c2b"
        stroke="#a78bfa"
        strokeOpacity="0.6"
        strokeWidth="1.5"
      />

      <line
        x1="264"
        y1="66"
        x2="264"
        y2="108"
        stroke="#a78bfa"
        strokeOpacity="0.4"
      />

      <rect x="70" y="184" width="120" height="6" rx="3" fill="#7c3aed" opacity="0.6" />
      <rect x="330" y="184" width="120" height="6" rx="3" fill="#7c3aed" opacity="0.6" />

      <circle cx="150" cy="218" r="34" fill="#0b0b13" stroke="#3f3f52" strokeWidth="10" />
      <circle cx="150" cy="218" r="12" fill="#3f3f52" />

      <circle cx="390" cy="218" r="34" fill="#0b0b13" stroke="#3f3f52" strokeWidth="10" />
      <circle cx="390" cy="218" r="12" fill="#3f3f52" />

      <rect x="60" y="150" width="26" height="10" rx="5" fill="#c4b5fd" opacity="0.9" />
      <rect x="434" y="150" width="26" height="10" rx="5" fill="#ef4444" opacity="0.8" />
    </svg>
  );
}
