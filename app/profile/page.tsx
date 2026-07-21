import Link from "next/link";
import { Users, Wallet } from "lucide-react";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import DriverCard from "@/components/driver/DriverCard";
import VehicleSetup from "@/components/profile/VehicleSetup";
import IdentitySettings from "@/components/profile/IdentitySettings";
import { getCurrentUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import {
  countTripsAsDriver,
  countTripsAsPassenger,
  getDriverEarnings,
} from "@/lib/trips";
import { getUserRatingStats } from "@/lib/reviews";
import { formatPrice, formatRating } from "@/lib/utils";

function reviewsWord(count: number) {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) return "отзыв";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "отзыва";
  return "отзывов";
}

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <main className="min-h-screen bg-[#0b0b13] text-white flex flex-col">
        <Navbar />

        <div className="flex-1 flex items-center justify-center px-5">
          <div className="text-center">
            <p className="text-gray-400 mb-5">
              Войдите, чтобы увидеть свой профиль.
            </p>

            <Link
              href="/login?redirect=/profile"
              className="inline-block bg-violet-600 hover:bg-violet-700 transition rounded-xl px-6 py-3 font-bold"
            >
              Войти
            </Link>
          </div>
        </div>

        <Footer />
      </main>
    );
  }

  const [asDriver, asPassenger, ratingStats, earnings, userRow] = await Promise.all([
    countTripsAsDriver(user.id),
    countTripsAsPassenger(user.id),
    getUserRatingStats(user.id),
    getDriverEarnings(user.id),
    sql<{ created_at: string }[]>`SELECT created_at FROM users WHERE id = ${user.id}`,
  ]);

  const memberSince = new Date(userRow[0].created_at).toLocaleDateString("ru-RU", {
    year: "numeric",
    month: "long",
  });

  return (
    <main className="min-h-screen bg-[#0b0b13] text-white flex flex-col">
      <Navbar />

      <div className="max-w-md w-full mx-auto px-5 py-10 flex-1">
        <h1 className="text-3xl font-bold mb-6">Профиль</h1>

        <DriverCard
          driver={user.name}
          rating={ratingStats.average}
          verified={false}
          tripsCount={asDriver}
          gender={user.gender}
        />

        <div className="text-sm text-gray-500 mt-4 space-y-1">
          <div>+{user.phone}</div>
          <div>
            {user.role === "driver" ? "Режим: водитель" : "Режим: пассажир"} ·
            {" "}На сайте с {memberSince}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="bg-[#12121c] border border-white/5 rounded-2xl p-4">
            <div className="flex items-center gap-2 text-gray-500 text-xs mb-2">
              <Users size={14} />
              Поездок как пассажир
            </div>

            <div className="text-2xl font-bold">{asPassenger}</div>
          </div>

          <div className="bg-[#12121c] border border-white/5 rounded-2xl p-4">
            <div className="text-gray-500 text-xs mb-2">Рейтинг</div>

            <div className="text-2xl font-bold">
              {ratingStats.count > 0 ? (
                <>
                  {formatRating(ratingStats.average)}{" "}
                  <span className="text-sm font-normal text-gray-500">
                    ({ratingStats.count} {reviewsWord(ratingStats.count)})
                  </span>
                </>
              ) : (
                <span className="text-base font-normal text-gray-500">
                  Пока нет отзывов
                </span>
              )}
            </div>
          </div>

          <div className="bg-[#12121c] border border-white/5 rounded-2xl p-4 col-span-2">
            <div className="flex items-center gap-2 text-gray-500 text-xs mb-2">
              <Wallet size={14} />
              Заработано как водитель
            </div>

            <div className="text-2xl font-bold">{formatPrice(earnings)}</div>
          </div>
        </div>

        <IdentitySettings />

        {user.role === "driver" && (
          <div className="mt-6">
            <VehicleSetup />
          </div>
        )}
      </div>

      <Footer />
    </main>
  );
}
