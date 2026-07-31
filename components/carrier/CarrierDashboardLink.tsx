"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bus } from "lucide-react";

export default function CarrierDashboardLink() {
  const [state, setState] = useState<{ carrierName: string; href: string } | null>(null);

  useEffect(() => {
    fetch("/api/carrier/me", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (!data.linked) return setState(null);
        setState({
          carrierName: data.carrierName,
          href: data.role === "driver" ? "/carrier/driver" : "/carrier/dashboard",
        });
      })
      .catch(() => setState(null));
  }, []);

  if (!state) return null;

  return (
    <Link
      href={state.href}
      className="flex items-center gap-2.5 bg-[#171726] border border-amber-500/20 rounded-2xl px-4 py-3 mb-4 text-sm font-medium hover:border-amber-500/40 transition"
    >
      <Bus size={16} className="text-amber-400" />
      Кабинет перевозчика «{state.carrierName}»
    </Link>
  );
}
