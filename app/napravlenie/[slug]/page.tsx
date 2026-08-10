import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus, Users } from "lucide-react";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import TripsList from "@/components/TripsList";
import CarrierHighlightCard from "@/components/carrier/CarrierHighlightCard";
import DriverBonusPromo from "@/components/DriverBonusPromo";
import JsonLd from "@/components/seo/JsonLd";
import { listTrips } from "@/lib/trips";
import { popularDirections } from "@/data/popularDirections";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

function findDirection(slug: string) {
  return popularDirections.find((route) => route.slug === slug);
}

export function generateStaticParams() {
  return popularDirections.map((route) => ({ slug: route.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const direction = findDirection(slug);

  if (!direction) return { title: "Направление не найдено" };

  const title = `Попутчики ${direction.from} — ${direction.to}`;
  const description = `Расписание поездок ${direction.from} — ${direction.to} на Едем30: актуальные места, цены от ${direction.price} ₽, проверенные водители и перевозчики. Забронируйте место или разместите свою поездку.`;

  return {
    title,
    description,
    alternates: {
      canonical: `/napravlenie/${direction.slug}`,
    },
    openGraph: {
      title: `${title} · Едем30`,
      description,
    },
  };
}

export default async function DirectionPage({ params }: Props) {
  const { slug } = await params;
  const direction = findDirection(slug);

  if (!direction) notFound();

  const trips = await listTrips("intercity");
  const routeTrips = trips.filter(
    (trip) => trip.from === direction.from && trip.to === direction.to
  );

  const otherDirections = popularDirections.filter((route) => route.slug !== slug);

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Едем30", item: "https://edem30.ru/" },
      { "@type": "ListItem", position: 2, name: "Межгород", item: "https://edem30.ru/search" },
      {
        "@type": "ListItem",
        position: 3,
        name: `${direction.from} — ${direction.to}`,
        item: `https://edem30.ru/napravlenie/${direction.slug}`,
      },
    ],
  };

  return (
    <main className="min-h-screen bg-[#0b0b13] text-white flex flex-col">
      <JsonLd data={breadcrumbJsonLd} />

      <Navbar />

      <div className="max-w-2xl w-full mx-auto px-5 py-8 flex-1">
        <nav className="text-xs text-gray-500 mb-4 flex items-center gap-1.5 flex-wrap">
          <Link href="/" className="hover:text-gray-300 transition">
            Едем30
          </Link>
          <span>/</span>
          <Link href="/search" className="hover:text-gray-300 transition">
            Межгород
          </Link>
          <span>/</span>
          <span className="text-gray-400">
            {direction.from} — {direction.to}
          </span>
        </nav>

        <h1 className="text-3xl font-bold leading-tight">
          Попутчики {direction.from} — {direction.to}
        </h1>

        <p className="text-gray-400 mt-3 leading-relaxed">{direction.intro}</p>

        <div className="flex flex-wrap gap-3 mt-6">
          <Link
            href={`/create-trip?type=intercity&from=${encodeURIComponent(direction.from)}&to=${encodeURIComponent(direction.to)}`}
            className="btn-gradient flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold transition"
          >
            <Plus size={16} />
            Разместить поездку
          </Link>

          <Link
            href="/find-driver"
            className="flex items-center gap-2 bg-[#171726] border border-white/10 hover:border-violet-500/40 rounded-2xl px-5 py-3 text-sm font-bold transition"
          >
            <Users size={16} />
            Не нашли машину? Оставить заявку
          </Link>
        </div>

        <CarrierHighlightCard from={direction.from} to={direction.to} />

        <TripsList
          trips={routeTrips}
          emptyText={`Активных поездок ${direction.from} — ${direction.to} пока нет — оставьте заявку выше, и водители увидят, что вам нужен этот маршрут.`}
        />

        <DriverBonusPromo />

        {otherDirections.length > 0 && (
          <div className="mt-10">
            <div className="text-sm text-gray-500 font-medium mb-3">Другие направления</div>

            <div className="flex flex-wrap gap-2">
              {otherDirections.map((route) => (
                <Link
                  key={route.slug}
                  href={`/napravlenie/${route.slug}`}
                  className="text-sm bg-[#171726] border border-white/5 hover:border-violet-500/40 rounded-full px-4 py-2 transition"
                >
                  {route.from} → {route.to}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <Footer />
    </main>
  );
}
