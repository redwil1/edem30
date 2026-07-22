"use client";

import { ReactNode, useState } from "react";

export type ProfileTab = {
  key: string;
  label: string;
  content: ReactNode;
};

export default function ProfileTabs({ tabs }: { tabs: ProfileTab[] }) {
  const [active, setActive] = useState(tabs[0]?.key);

  return (
    <div>
      <div className="flex items-center gap-1 bg-[#171723] rounded-2xl p-1 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActive(tab.key)}
            className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition ${
              active === tab.key
                ? "bg-violet-600 text-white"
                : "text-gray-300 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {tabs.find((tab) => tab.key === active)?.content}
    </div>
  );
}
