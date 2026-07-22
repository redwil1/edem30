"use client";

import { useEffect, useState } from "react";
import { Loader2, Phone } from "lucide-react";

type Revealed = {
  userId: number;
  name: string;
  phone: string;
};

type Props = {
  tripId: number;
};

export default function PhoneShareCard({ tripId }: Props) {
  const [consented, setConsented] = useState<boolean | null>(null);
  const [revealed, setRevealed] = useState<Revealed[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    const res = await fetch(`/api/trips/${tripId}/phone-consent`, {
      cache: "no-store",
    });

    if (!res.ok) return;

    const data = await res.json();
    setConsented(data.consented);
    setRevealed(data.revealed ?? []);
  }

  useEffect(() => {
    load();

    const interval = setInterval(load, 8000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId]);

  async function share() {
    setLoading(true);

    try {
      const res = await fetch(`/api/trips/${tripId}/phone-consent`, {
        method: "POST",
      });

      if (res.ok) {
        const data = await res.json();
        setConsented(true);
        setRevealed(data.revealed ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  if (consented === null) return null;

  return (
    <div className="border-t border-white/5 mt-4 pt-4">
      <div className="flex items-center gap-2 text-sm font-medium mb-1.5">
        <Phone size={15} className="text-violet-400" />
        Обмен номерами телефона
      </div>

      <p className="text-xs text-gray-500 leading-relaxed mb-3">
        Необязательно — номер станет виден только если обе стороны
        согласятся поделиться им.
      </p>

      {revealed.length > 0 ? (
        <div className="space-y-1.5">
          {revealed.map((r) => (
            <a
              key={r.userId}
              href={`tel:+${r.phone}`}
              className="flex items-center justify-between bg-violet-600/10 border border-violet-500/20 rounded-xl px-3.5 py-2.5 text-sm hover:border-violet-500/40 transition"
            >
              <span>{r.name}</span>
              <span className="font-mono text-violet-300">+{r.phone}</span>
            </a>
          ))}
        </div>
      ) : consented ? (
        <p className="text-xs text-gray-500">
          Вы согласились поделиться номером. Ждём согласия второй стороны.
        </p>
      ) : (
        <button
          type="button"
          onClick={share}
          disabled={loading}
          className="flex items-center gap-2 text-sm font-medium bg-[#1c1c2b] hover:bg-white/10 disabled:opacity-60 transition rounded-xl px-4 py-2.5"
        >
          {loading && <Loader2 size={14} className="animate-spin" />}
          Поделиться своим номером
        </button>
      )}
    </div>
  );
}
