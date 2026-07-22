"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

export type FaqItem = {
  question: string;
  answer: string[];
};

export type FaqSection = {
  title: string;
  items: FaqItem[];
};

function AccordionItem({ item, open, onToggle }: { item: FaqItem; open: boolean; onToggle: () => void }) {
  return (
    <div className="bg-[#12121c] border border-white/5 rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 text-left px-4 sm:px-5 py-4"
      >
        <span className="font-medium text-sm sm:text-base">{item.question}</span>

        <ChevronDown
          size={18}
          className={`text-gray-500 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="px-4 sm:px-5 pb-4 space-y-2">
          {item.answer.map((p, i) => (
            <p key={i} className="text-sm text-gray-400 leading-relaxed">
              {p}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export default function FaqAccordion({ sections }: { sections: FaqSection[] }) {
  const [openKey, setOpenKey] = useState<string | null>(`${sections[0]?.title}-0`);

  return (
    <div className="space-y-10">
      {sections.map((section) => (
        <section key={section.title}>
          <h2 className="font-bold text-lg sm:text-xl mb-4">{section.title}</h2>

          <div className="space-y-2.5">
            {section.items.map((item, i) => {
              const key = `${section.title}-${i}`;

              return (
                <AccordionItem
                  key={key}
                  item={item}
                  open={openKey === key}
                  onToggle={() => setOpenKey(openKey === key ? null : key)}
                />
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
