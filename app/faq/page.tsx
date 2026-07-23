import type { Metadata } from "next";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import FaqAccordion from "@/components/faq/FaqAccordion";
import { faqSections as sections } from "@/data/faqContent";

export const metadata: Metadata = {
  title: "Вопросы и ответы",
  description:
    "Как создать поездку, найти такси, оплатить и пользоваться сервисом Едем30 — подробные ответы по шагам.",
};

export default function FaqPage() {
  return (
    <main className="min-h-screen bg-[#0b0b13] text-white flex flex-col">
      <Navbar />

      <div className="max-w-[820px] w-full mx-auto px-5 sm:px-6 lg:px-10 py-12 lg:py-16 flex-1">
        <h1 className="text-3xl sm:text-4xl font-bold leading-tight">
          Вопросы и ответы
        </h1>

        <p className="text-gray-400 mt-4 text-base sm:text-lg max-w-2xl">
          Подробно и по шагам — как создать поездку, найти такси и
          пользоваться сервисом, даже если вы делаете это впервые.
        </p>

        <div className="mt-10">
          <FaqAccordion sections={sections} />
        </div>
      </div>

      <Footer />
    </main>
  );
}
