import Link from "next/link";
import { Bus, Car, MessageCircle, ShieldCheck, Star, Users } from "lucide-react";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

const steps = [
  {
    icon: Users,
    title: "Регистрируетесь",
    text: "Это займёт меньше минуты — только имя, телефон и пароль.",
  },
  {
    icon: Bus,
    title: "Ищете или публикуете поездку",
    text: "Едете за город — выберите рейс в разделе «Межгород». Возите людей по городу — опубликуйте поездку в разделе «Такси».",
  },
  {
    icon: MessageCircle,
    title: "Договариваетесь в чате",
    text: "У каждой поездки есть чат с водителем и попутчиками — уточните детали заранее.",
  },
];

const values = [
  {
    icon: ShieldCheck,
    title: "Прозрачность",
    text: "Вы всегда видите, кто ведёт поездку, рейтинг водителя и число отзывов.",
  },
  {
    icon: Star,
    title: "Отзывы участников",
    text: "Оценки ставят реальные попутчики после завершения поездки.",
  },
  {
    icon: Car,
    title: "Открытая площадка",
    text: "Публиковать поездки может любой зарегистрированный пользователь — Едем30 лишь сводит вместе водителей и попутчиков.",
  },
];

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#0b0b13] text-white flex flex-col">
      <Navbar />

      <div className="max-w-[1000px] w-full mx-auto px-5 sm:px-6 lg:px-10 py-12 lg:py-16 flex-1">
        <h1 className="text-3xl sm:text-4xl font-bold leading-tight">
          Едем<span className="text-violet-400">30</span> — сервис поездок по
          городу и межгороду
        </h1>

        <p className="text-gray-400 mt-4 text-base sm:text-lg max-w-2xl">
          Мы помогаем людям добираться туда, куда нужно: находить попутчиков в
          соседний город и заказывать такси по городу — без диспетчеров и
          посредников.
        </p>

        <section className="mt-12">
          <h2 className="font-bold text-xl sm:text-2xl mb-6">Как это работает</h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {steps.map((step, i) => {
              const Icon = step.icon;

              return (
                <div
                  key={step.title}
                  className="bg-[#12121c] border border-white/5 rounded-3xl p-5"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-xl bg-violet-600/15 flex items-center justify-center shrink-0">
                      <Icon size={16} className="text-violet-400" />
                    </div>

                    <div className="text-xs text-gray-500 font-medium">
                      Шаг {i + 1}
                    </div>
                  </div>

                  <div className="font-bold mb-2">{step.title}</div>

                  <p className="text-sm text-gray-500 leading-relaxed">
                    {step.text}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-12">
          <h2 className="font-bold text-xl sm:text-2xl mb-6">
            На чём мы стоим
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {values.map((value) => {
              const Icon = value.icon;

              return (
                <div key={value.title}>
                  <div className="w-11 h-11 rounded-xl bg-violet-600/15 flex items-center justify-center mb-4">
                    <Icon size={20} className="text-violet-400" />
                  </div>

                  <div className="font-bold mb-2">{value.title}</div>

                  <p className="text-sm text-gray-500 leading-relaxed">
                    {value.text}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-12 bg-[#12121c] border border-violet-500/20 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div>
            <div className="font-bold text-lg mb-1">Готовы начать возить людей?</div>

            <p className="text-sm text-gray-500 max-w-md">
              Зарегистрируйтесь и опубликуйте свою первую поездку — по городу
              или в соседний населённый пункт.
            </p>
          </div>

          <Link
            href="/create-trip"
            className="inline-flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 transition rounded-xl px-6 py-3 text-sm font-bold whitespace-nowrap shrink-0"
          >
            Предложить поездку
          </Link>
        </section>
      </div>

      <Footer />
    </main>
  );
}
