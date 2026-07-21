import { TripType } from "@/types/trips";

type Props = {
  value: TripType;
  onChange: (value: TripType) => void;
};

export default function CategorySwitch({ value, onChange }: Props) {
  return (
    <div className="flex bg-[#171723] rounded-2xl p-1 mb-6">
      <button
        type="button"
        onClick={() => onChange("intercity")}
        className={`flex-1 rounded-xl py-3 font-medium transition ${
          value === "intercity" ? "bg-violet-600" : "text-gray-300"
        }`}
      >
        🚐 Межгород
      </button>

      <button
        type="button"
        onClick={() => onChange("city")}
        className={`flex-1 rounded-xl py-3 font-medium transition ${
          value === "city" ? "bg-violet-600" : "text-gray-300"
        }`}
      >
        🚖 Такси
      </button>
    </div>
  );
}
