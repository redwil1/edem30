import TripSearch from "@/components/TripSearch";
import { listTrips } from "@/lib/trips";

export default function SearchPage() {
  const trips = listTrips("intercity");

  return (
    <main className="min-h-screen bg-[#0b0b13] text-white">
      <div className="max-w-md mx-auto px-5 py-8">
        <h1 className="text-3xl font-bold mb-6">Поиск поездок</h1>

        <TripSearch trips={trips} emptyText="Межгородних поездок пока нет" />
      </div>
    </main>
  );
}
