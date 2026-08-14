import { formatPrice } from "@/lib/utils";
import type { PriceType } from "@/lib/marketplace";

export default function ListingPrice({
  price,
  priceType,
  className = "",
}: {
  price: number | null;
  priceType: PriceType;
  className?: string;
}) {
  if (priceType === "free") {
    return <span className={`text-green-400 font-bold ${className}`}>Бесплатно</span>;
  }

  return (
    <span className={`text-violet-400 font-bold ${className}`}>
      {formatPrice(price ?? 0)}
    </span>
  );
}
