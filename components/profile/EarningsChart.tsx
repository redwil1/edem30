"use client";

import { useState } from "react";
import { List, TrendingUp } from "lucide-react";

import { formatPrice } from "@/lib/utils";

type Week = {
  weekStart: string;
  total: number;
};

type Props = {
  weeks: Week[];
};

function formatWeekLabel(weekStart: string) {
  const d = new Date(`${weekStart}T00:00:00Z`);
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

const CHART_HEIGHT = 140;
const BAR_GAP = 8;

export default function EarningsChart({ weeks }: Props) {
  const [view, setView] = useState<"chart" | "table">("chart");
  const [hovered, setHovered] = useState<number | null>(null);

  const max = Math.max(...weeks.map((w) => w.total), 1);
  const total = weeks.reduce((sum, w) => sum + w.total, 0);

  return (
    <div className="bg-[#12121c] border border-white/5 rounded-3xl p-4 sm:p-6 mt-6">
      <div className="flex items-center justify-between gap-3 mb-1">
        <div className="flex items-center gap-2">
          <TrendingUp size={18} className="text-violet-400" />
          <div className="font-display font-bold">Заработок по неделям</div>
        </div>

        <button
          type="button"
          onClick={() => setView(view === "chart" ? "table" : "chart")}
          className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-white transition"
        >
          <List size={13} />
          {view === "chart" ? "Таблица" : "График"}
        </button>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        Всего за период: <span className="text-gray-300">{formatPrice(total)}</span>
      </p>

      {view === "chart" ? (
        <div
          className="flex items-end gap-2"
          style={{ height: CHART_HEIGHT }}
          role="img"
          aria-label={`Заработок по неделям, всего ${formatPrice(total)}`}
        >
          {weeks.map((w, i) => {
            const barHeight = Math.max((w.total / max) * (CHART_HEIGHT - 24), w.total > 0 ? 4 : 2);

            return (
              <div
                key={w.weekStart}
                className="flex-1 flex flex-col items-center justify-end h-full relative"
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              >
                {hovered === i && (
                  <div className="absolute -top-1 -translate-y-full bg-[#222233] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs whitespace-nowrap z-10 shadow-lg">
                    <div className="font-bold">{formatPrice(w.total)}</div>
                    <div className="text-gray-500">{formatWeekLabel(w.weekStart)}</div>
                  </div>
                )}

                <div
                  className="w-full rounded-t-[4px] bg-violet-500 transition-opacity"
                  style={{
                    height: barHeight,
                    marginLeft: BAR_GAP / 2,
                    marginRight: BAR_GAP / 2,
                    opacity: hovered === null || hovered === i ? 1 : 0.5,
                  }}
                />

                <div className="text-[10px] text-gray-500 mt-1.5 whitespace-nowrap">
                  {formatWeekLabel(w.weekStart)}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-1.5">
          {weeks
            .slice()
            .reverse()
            .map((w) => (
              <div
                key={w.weekStart}
                className="flex items-center justify-between text-sm bg-[#1c1c2b] rounded-lg px-3 py-2"
              >
                <span className="text-gray-400">{formatWeekLabel(w.weekStart)}</span>
                <span className="font-medium">{formatPrice(w.total)}</span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
