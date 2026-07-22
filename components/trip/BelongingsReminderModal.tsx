"use client";

import { Backpack } from "lucide-react";

type Props = {
  onContinue: () => void;
};

export default function BelongingsReminderModal({ onContinue }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-5"
      onClick={onContinue}
    >
      <div
        className="bg-[#171726] border border-white/10 rounded-3xl p-6 w-full max-w-sm text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-14 h-14 rounded-2xl bg-amber-500/15 flex items-center justify-center mx-auto mb-4">
          <Backpack size={26} className="text-amber-400" />
        </div>

        <div className="font-display font-bold text-lg">
          Не забывайте личные вещи
        </div>

        <p className="text-sm text-gray-500 mt-2">
          Проверьте салон, прежде чем закрыть поездку. Чат с водителем
          останется открытым ещё минуту — на случай, если что-то забыли.
        </p>

        <button
          type="button"
          onClick={onContinue}
          className="btn-gradient w-full mt-5 rounded-xl py-3 text-sm font-bold"
        >
          Понятно
        </button>
      </div>
    </div>
  );
}
