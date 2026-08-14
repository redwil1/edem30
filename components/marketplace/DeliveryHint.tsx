import Link from "next/link";
import { Car } from "lucide-react";

export default function DeliveryHint({ fromCity, toCity }: { fromCity: string; toCity: string }) {
  return (
    <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/25 rounded-2xl p-4 text-sm">
      <Car size={18} className="text-amber-400 shrink-0 mt-0.5" />

      <div>
        <div className="text-amber-300 font-medium">
          Вы в «{toCity}», товар в «{fromCity}»
        </div>
        <p className="text-gray-400 mt-1 leading-relaxed">
          Вещь можно передать с попутчиком, который едет по этому маршруту.
        </p>

        <Link
          href={`/search?from=${encodeURIComponent(fromCity)}&to=${encodeURIComponent(toCity)}`}
          className="inline-block text-amber-400 hover:text-amber-300 font-medium mt-2 transition"
        >
          Найти поездку →
        </Link>
      </div>
    </div>
  );
}
