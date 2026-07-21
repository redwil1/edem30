import { Flame, CircleCheck, TrendingUp, BadgeCheck } from "lucide-react";

import { Trip } from "@/types/trips";

type Badge = {
  key: string;
  label: string;
  icon: typeof Flame;
  className: string;
};

function buildBadges(trip: Trip): Badge[] {
  const badges: Badge[] = [];

  if (trip.seats === 1) {
    badges.push({
      key: "last-seat",
      label: "Последнее место",
      icon: Flame,
      className: "bg-red-500/15 text-red-400 border border-red-500/20",
    });
  } else if (trip.seats > 3) {
    badges.push({
      key: "seats-available",
      label: "Есть свободные места",
      icon: CircleCheck,
      className: "bg-green-500/15 text-green-400 border border-green-500/20",
    });
  } else {
    badges.push({
      key: "seats-left",
      label: `Осталось ${trip.seats} места`,
      icon: Flame,
      className: "bg-orange-500/15 text-orange-400 border border-orange-500/20",
    });
  }

  const takenSeats = trip.totalSeats - trip.seats;

  if (trip.totalSeats > 0 && takenSeats / trip.totalSeats >= 0.5 && trip.seats > 0) {
    badges.push({
      key: "selling-fast",
      label: "Быстро разбирают",
      icon: TrendingUp,
      className: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/20",
    });
  }

  if (trip.verified) {
    badges.push({
      key: "verified",
      label: "Проверенный водитель",
      icon: BadgeCheck,
      className: "bg-violet-500/15 text-violet-300 border border-violet-500/20",
    });
  }

  return badges;
}

type Props = {
  trip: Trip;
};

export default function TripBadges({ trip }: Props) {
  const badges = buildBadges(trip);

  if (badges.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {badges.map((b) => {
        const Icon = b.icon;

        return (
          <span
            key={b.key}
            className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full whitespace-nowrap ${b.className}`}
          >
            <Icon size={11} />
            {b.label}
          </span>
        );
      })}
    </div>
  );
}
