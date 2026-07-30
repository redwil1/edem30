"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bus } from "lucide-react";

export default function CarrierDashboardLink() {
  const [carrierName, setCarrierName] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/carrier/me", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setCarrierName(data.linked ? data.carrierName : null))
      .catch(() => setCarrierName(null));
  }, []);

  if (!carrierName) return null;

  return (
    <Link
      href="/carrier/dashboard"
      className="flex items-center gap-2.5 bg-[#171726] border border-amber-500/20 rounded-2xl px-4 py-3 mb-4 text-sm font-medium hover:border-amber-500/40 transition"
    >
      <Bus size={16} className="text-amber-400" />
      Кабинет перевозчика «{carrierName}»
    </Link>
  );
}
