import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import CarrierPublicRides from "@/components/carrier/CarrierPublicRides";
import { getCarrierBySlug, recordPageView } from "@/lib/carriers";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const carrier = await getCarrierBySlug(slug);

  if (!carrier) return { title: "Перевозчик не найден | Едем30" };

  return {
    title: `${carrier.name}${carrier.tagline ? ` — ${carrier.tagline}` : ""} | Едем30`,
    description: carrier.tagline ?? `${carrier.name} на Едем30 — актуальное расписание и свободные места.`,
  };
}

export default async function CarrierPage({ params }: Props) {
  const { slug } = await params;
  const carrier = await getCarrierBySlug(slug);

  if (!carrier) {
    return (
      <main className="min-h-screen bg-[#0b0b13] text-white flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center py-32">
          <h1 className="text-3xl font-bold">Перевозчик не найден</h1>
        </div>
        <Footer />
      </main>
    );
  }

  await recordPageView(carrier.id);

  return (
    <main className="min-h-screen bg-[#0b0b13] text-white flex flex-col">
      <Navbar />

      <div className="max-w-2xl w-full mx-auto px-5 py-10 flex-1">
        <div className="bg-[#171726] border border-violet-500/20 rounded-3xl p-6 mb-6">
          <h1 className="text-2xl font-bold mb-2">{carrier.name}</h1>

          {carrier.verified && (
            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-400 bg-violet-500/10 rounded-full px-3 py-1 mb-3">
              <ShieldCheck size={13} />
              Проверенный перевозчик
            </div>
          )}

          {carrier.tagline && <p className="text-gray-400">{carrier.tagline}</p>}
        </div>

        <h2 className="text-lg font-bold mb-4">Ближайшие рейсы</h2>

        <CarrierPublicRides slug={slug} />
      </div>

      <Footer />
    </main>
  );
}
