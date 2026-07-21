import Link from "next/link";

import TripSearch from "@/components/TripSearch";
import { getCurrentUser } from "@/lib/auth";
import { listTrips } from "@/lib/trips";

export const dynamic = "force-dynamic";

export default async function SearchPage() {
  const [trips, user] = await Promise.all([
    listTrips("intercity"),
    getCurrentUser(),
  ]);

  return (
    <main className="min-h-screen bg-[#0b0b13] text-white">
      <div className="max-w-md mx-auto px-5 py-8">
        <div className="flex items-center justify-between gap-3 mb-6">
          <h1 className="text-3xl font-bold">Поиск поездок</h1>

          {user?.role === "driver" && (
            <Link
              href="/create-trip"
              className="text-sm text-violet-400 hover:text-violet-300 transition whitespace-nowrap shrink-0"
            >
              + Добавить поездку
            </Link>
          )}
        </div>

        <TripSearch trips={trips} emptyText="Межгородних поездок пока нет" />
      </div>
    </main>
  );
}
