"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageCircle, Phone } from "lucide-react";

import { useAuth } from "@/components/auth/AuthProvider";

export default function ContactButtons({ listingId }: { listingId: number }) {
  const router = useRouter();
  const { user } = useAuth();
  const [messaging, setMessaging] = useState(false);
  const [revealingPhone, setRevealingPhone] = useState(false);
  const [phone, setPhone] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function writeMessage() {
    if (!user) {
      router.push(`/login?redirect=/marketplace/${listingId}`);
      return;
    }

    setMessaging(true);
    setError("");

    const res = await fetch(`/api/marketplace/listings/${listingId}/contact`, { method: "POST" });
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      setError(data?.error || "Не удалось открыть чат");
      setMessaging(false);
      return;
    }

    router.push(`/dm/${data.conversationId}`);
  }

  async function revealPhone() {
    if (!user) {
      router.push(`/login?redirect=/marketplace/${listingId}`);
      return;
    }

    if (phone) return;

    setRevealingPhone(true);
    setError("");

    const res = await fetch(`/api/marketplace/listings/${listingId}/phone`);
    const data = await res.json().catch(() => null);

    setRevealingPhone(false);

    if (!res.ok) {
      setError(data?.error || "Продавец не подтвердил телефон");
      return;
    }

    setPhone(data.phone);
  }

  return (
    <div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={writeMessage}
          disabled={messaging}
          className="btn-gradient flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold disabled:opacity-60 transition"
        >
          {messaging ? <Loader2 size={15} className="animate-spin" /> : <MessageCircle size={15} />}
          Написать
        </button>

        <button
          type="button"
          onClick={revealPhone}
          disabled={revealingPhone}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold border border-white/10 hover:border-violet-500/40 disabled:opacity-60 transition"
        >
          {revealingPhone ? <Loader2 size={15} className="animate-spin" /> : <Phone size={15} />}
          {phone ?? "Позвонить"}
        </button>
      </div>

      {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
    </div>
  );
}
