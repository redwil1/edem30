import { formatRating } from "@/lib/utils";
import AvatarUploader from "@/components/profile/AvatarUploader";
import { GENDERS } from "@/lib/avatarPresets";

type Props = {
  driver: string;
  rating: number;
  verified: boolean;
  tripsCount: number;
  gender?: string | null;
};

function genderLabel(gender: string | null | undefined) {
  return GENDERS.find((g) => g.value === gender)?.label ?? "не указан";
}

export default function DriverCard({
  driver,
  rating,
  verified,
  tripsCount,
  gender,
}: Props) {
  return (
    <div className="bg-[#171726] rounded-3xl p-5 border border-violet-500/10">
      <div className="flex items-center gap-4">
        <AvatarUploader />

        <div>
          <div className="font-bold text-lg">{driver}</div>

          <div className="text-xs text-gray-500 mt-0.5">
            Пол: {genderLabel(gender)}
          </div>

          <div className="text-yellow-400 mt-0.5">⭐ {formatRating(rating)}</div>
        </div>
      </div>

      {verified && (
        <div className="mt-5 text-green-400">🛡 Проверенный перевозчик</div>
      )}

      <div className="mt-2 text-gray-400">
        🏆 {tripsCount.toLocaleString("ru-RU")} поездок
      </div>
    </div>
  );
}
