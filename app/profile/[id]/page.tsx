import Link from "next/link";
import { redirect } from "next/navigation";
import { Users, Car } from "lucide-react";

import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Avatar from "@/components/trip/Avatar";
import ProfileTabs from "@/components/profile/ProfileTabs";
import ReviewsList from "@/components/profile/ReviewsList";
import { getCurrentUser, getPublicUserById } from "@/lib/auth";
import { countTripsAsDriver, countTripsAsPassenger } from "@/lib/trips";
import { getUserRatingStats, listUserReviews } from "@/lib/reviews";
import { formatRating } from "@/lib/utils";

const GENDER_LABELS: Record<string, string> = {
  male: "Мужской",
  female: "Женский",
};

function reviewsWord(count: number) {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) return "отзыв";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "отзыва";
  return "отзывов";
}

type Props = {
  params: Promise<{ id: string }>;
};

export default async function PublicProfilePage({ params }: Props) {
  const { id } = await params;
  const userId = Number(id);

  if (!Number.isInteger(userId) || userId <= 0) {
    return (
      <main className="min-h-screen bg-[#0b0b13] text-white flex flex-col">
        <Navbar />

        <div className="flex-1 flex items-center justify-center py-32">
          <h1 className="text-3xl font-bold">Пользователь не найден</h1>
        </div>

        <Footer />
      </main>
    );
  }

  const currentUser = await getCurrentUser();

  if (currentUser?.id === userId) {
    redirect("/profile");
  }

  const target = await getPublicUserById(userId);

  if (!target) {
    return (
      <main className="min-h-screen bg-[#0b0b13] text-white flex flex-col">
        <Navbar />

        <div className="flex-1 flex items-center justify-center py-32">
          <h1 className="text-3xl font-bold">Пользователь не найден</h1>
        </div>

        <Footer />
      </main>
    );
  }

  const [asDriver, asPassenger, ratingStats, reviews] = await Promise.all([
    countTripsAsDriver(target.id),
    countTripsAsPassenger(target.id),
    getUserRatingStats(target.id),
    listUserReviews(target.id),
  ]);

  const memberSince = new Date(target.createdAt).toLocaleDateString("ru-RU", {
    year: "numeric",
    month: "long",
  });

  return (
    <main className="min-h-screen bg-[#0b0b13] text-white flex flex-col">
      <Navbar />

      <div className="max-w-md w-full mx-auto px-5 py-10 flex-1">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-white transition border border-white/10 rounded-xl px-4 py-2.5 mb-6"
        >
          ← Назад
        </Link>

        <ProfileTabs
          tabs={[
            {
              key: "overview",
              label: "Профиль",
              content: (
                <>
                  <div className="bg-[#171726] rounded-3xl p-5 border border-violet-500/10">
                <div className="flex items-center gap-4">
                  <Avatar
                    name={target.name}
                    size={64}
                    avatarUrl={target.avatarUrl}
                    avatarPreset={target.avatarPreset}
                  />

                  <div>
                    <div className="font-bold text-lg">{target.name}</div>

                    <div className="text-xs text-gray-500 mt-0.5">
                      Пол: {target.gender ? GENDER_LABELS[target.gender] ?? "не указан" : "не указан"}
                    </div>

                    <div className="text-yellow-400 mt-0.5">
                      ⭐ {formatRating(ratingStats.average)}
                    </div>
                  </div>
                </div>

                <div className="mt-4 text-sm text-gray-500">
                  На сайте с {memberSince}
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
                  <div className="flex items-center gap-2 text-gray-500 text-xs mb-2">
                    <Car size={14} />
                    Поездок как водитель
                  </div>

                  <div className="text-2xl font-bold">{asDriver}</div>
                </div>

                <div className="bg-[#12121c] border border-white/5 rounded-2xl p-4 col-span-2">
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
              </div>
                </>
              ),
            },
            {
              key: "reviews",
              label: ratingStats.count > 0 ? `Отзывы (${ratingStats.count})` : "Отзывы",
              content: <ReviewsList reviews={reviews} />,
            },
          ]}
        />
      </div>

      <Footer />
    </main>
  );
}
