import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import HomeContent from "@/components/home/HomeContent";
import { listTrips } from "@/lib/trips";

export default function Home() {
  const trips = listTrips("intercity");

  return (
    <main className="min-h-screen bg-[#0b0b13] text-white">
      <Navbar />

      <HomeContent trips={trips} />

      <Footer />
    </main>
  );
}
