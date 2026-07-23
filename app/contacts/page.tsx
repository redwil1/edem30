import type { Metadata } from "next";
import Link from "next/link";
import { Building2, Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "Контакты",
  description: "Свяжитесь с поддержкой сервиса Едем30 — телефон, почта, чат и адрес.",
};

const contactCards = [
  {
    icon: Phone,
    title: "Телефон поддержки",
    lines: ["+7 (999) 123-45-67"],
    note: "Ежедневно, без выходных",
  },
  {
    icon: Mail,
    title: "Электронная почта",
    lines: ["support@edem30.ru"],
    note: "Отвечаем в течение рабочего дня",
  },
  {
    icon: MessageCircle,
    title: "Чат поддержки",
    lines: ["Telegram: @edem30bot"],
    href: "https://t.me/edem30bot",
    note: "Самый быстрый способ связи",
  },
  {
    icon: Clock,
    title: "Время работы",
    lines: ["Пн–Вс: 08:00–22:00"],
    note: "По московскому времени +1 (Астрахань)",
  },
];

export default function ContactsPage() {
  return (
    <main className="min-h-screen bg-[#0b0b13] text-white flex flex-col">
      <Navbar />

      <div className="max-w-[1000px] w-full mx-auto px-5 sm:px-6 lg:px-10 py-12 lg:py-16 flex-1">
        <h1 className="text-3xl sm:text-4xl font-bold leading-tight">
          Контакты
        </h1>

        <p className="text-gray-400 mt-4 text-base sm:text-lg max-w-2xl">
          Возникли вопросы по работе сервиса, поездке или оплате? Свяжитесь с
          нами любым удобным способом — мы на связи каждый день.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-10">
          {contactCards.map((card) => {
            const Icon = card.icon;

            const content = (
              <>
                <div className="w-11 h-11 rounded-xl bg-violet-600/15 flex items-center justify-center shrink-0">
                  <Icon size={18} className="text-violet-400" />
                </div>

                <div>
                  <div className="text-xs text-gray-500 mb-1">{card.title}</div>

                  {card.lines.map((line) => (
                    <div key={line} className="font-bold">
                      {line}
                    </div>
                  ))}

                  <div className="text-xs text-gray-500 mt-1">{card.note}</div>
                </div>
              </>
            );

            const className =
              "bg-[#12121c] border border-white/5 rounded-3xl p-5 flex items-start gap-4";

            return "href" in card && card.href ? (
              <Link
                key={card.title}
                href={card.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`${className} hover:border-violet-500/30 transition`}
              >
                {content}
              </Link>
            ) : (
              <div key={card.title} className={className}>
                {content}
              </div>
            );
          })}
        </div>

        <section className="mt-10 bg-[#12121c] border border-white/5 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-violet-600/15 flex items-center justify-center shrink-0">
            <MapPin size={18} className="text-violet-400" />
          </div>

          <div>
            <div className="text-xs text-gray-500 mb-1">Адрес</div>
            <div className="font-bold">
              г. Астрахань, ул. Никольская, д. 7, офис 302
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Работаем без приёма посетителей — все вопросы решаются онлайн
            </div>
          </div>
        </section>

        <section className="mt-6 bg-[#12121c] border border-white/5 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-violet-600/15 flex items-center justify-center shrink-0">
            <Building2 size={18} className="text-violet-400" />
          </div>

          <div>
            <div className="text-xs text-gray-500 mb-1">Реквизиты</div>
            <div className="font-bold">ООО «Едем30»</div>
            <div className="text-sm text-gray-400 mt-1 space-y-0.5">
              <div>ИНН 3025123456</div>
              <div>ОГРН 1163025012345</div>
              <div>Юридический адрес: г. Астрахань, ул. Никольская, д. 7</div>
            </div>
          </div>
        </section>
      </div>

      <Footer />
    </main>
  );
}
