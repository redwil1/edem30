type Props = {
  driver: string;
  rating: number;
  verified: boolean;
  tripsCount: number;
};

export default function DriverCard({
  driver,
  rating,
  verified,
  tripsCount,
}: Props) {
  return (
    <div className="bg-[#171726] rounded-3xl p-5 border border-violet-500/10">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-violet-600 flex items-center justify-center text-2xl">
          👤
        </div>

        <div>
          <div className="font-bold text-lg">{driver}</div>

          <div className="text-yellow-400">⭐ {rating}</div>
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
