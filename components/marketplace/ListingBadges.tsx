import { Flame } from "lucide-react";

import { typeLabel } from "@/data/marketplaceCategories";
import type { ListingStatus, ListingType, PriceType } from "@/lib/marketplace";

type Props = {
  type: ListingType;
  priceType: PriceType;
  urgent: boolean;
  status?: ListingStatus;
};

const STATUS_LABELS: Record<ListingStatus, { label: string; className: string }> = {
  active: { label: "", className: "" },
  reserved: { label: "Забронировано", className: "bg-amber-500/15 text-amber-400" },
  sold: { label: "Продано", className: "bg-green-500/15 text-green-400" },
  archived: { label: "Снято с публикации", className: "bg-white/10 text-gray-400" },
};

export default function ListingBadges({ type, priceType, urgent, status }: Props) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {urgent && (
        <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-1 rounded-full bg-amber-500/15 text-amber-400 whitespace-nowrap">
          <Flame size={11} />
          Срочно
        </span>
      )}

      {priceType === "negotiable" && (
        <span className="text-[10.5px] font-medium px-2 py-1 rounded-full bg-violet-600/15 text-violet-300 whitespace-nowrap">
          Торг уместен
        </span>
      )}

      {(type === "looking" || type === "exchange" || type === "free" || type === "buy") && (
        <span className="text-[10.5px] font-medium px-2 py-1 rounded-full bg-violet-600/15 text-violet-300 whitespace-nowrap">
          {typeLabel(type)}
        </span>
      )}

      {status && status !== "active" && (
        <span
          className={`text-[10.5px] font-bold px-2 py-1 rounded-full whitespace-nowrap ${STATUS_LABELS[status].className}`}
        >
          {STATUS_LABELS[status].label}
        </span>
      )}
    </div>
  );
}
