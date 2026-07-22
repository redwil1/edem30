"use client";

import { useEffect, useState } from "react";
import { Check, FileText, Loader2, X } from "lucide-react";

type Verification = {
  userId: number;
  name: string;
  phone: string;
  submittedAt: string | null;
  docUrl: string;
};

export default function AdminVerificationsTable() {
  const [items, setItems] = useState<Verification[] | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  async function load() {
    const res = await fetch("/api/admin/verifications", { cache: "no-store" });
    const data = await res.json();
    setItems(data.verifications ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function decide(userId: number, approve: boolean) {
    setBusyId(userId);

    await fetch(`/api/admin/verifications/${userId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approve }),
    });

    await load();
    setBusyId(null);
  }

  if (!items) {
    return (
      <div className="py-16 flex items-center justify-center text-gray-500">
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-[#12121c] border border-white/5 rounded-2xl py-16 text-center text-gray-500 text-sm">
        Заявок на верификацию нет
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((v) => (
        <div
          key={v.userId}
          className="bg-[#12121c] border border-white/5 rounded-2xl p-4 flex items-center justify-between gap-4 flex-wrap"
        >
          <div>
            <div className="font-medium">{v.name}</div>
            <div className="text-xs text-gray-500 mt-0.5">+{v.phone}</div>
          </div>

          <a
            href={v.docUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-sm font-medium text-violet-400 hover:text-violet-300 transition"
          >
            <FileText size={15} />
            Открыть документ
          </a>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => decide(v.userId, true)}
              disabled={busyId === v.userId}
              className="flex items-center gap-1.5 text-xs font-medium bg-green-500/15 text-green-400 hover:bg-green-500/25 disabled:opacity-60 transition rounded-lg px-3 py-1.5"
            >
              <Check size={13} />
              Подтвердить
            </button>

            <button
              type="button"
              onClick={() => decide(v.userId, false)}
              disabled={busyId === v.userId}
              className="flex items-center gap-1.5 text-xs font-medium bg-red-500/15 text-red-400 hover:bg-red-500/25 disabled:opacity-60 transition rounded-lg px-3 py-1.5"
            >
              <X size={13} />
              Отклонить
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
