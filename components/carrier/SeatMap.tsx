"use client";

type Props = {
  totalSeats: number;
  occupiedSeats: number;
  disabled?: boolean;
  onTapFreeSeat: () => void;
};

/**
 * Визуальная схема салона — не привязана 1:1 к конкретным броням (бронь
 * может занимать несколько мест сразу), а просто честно показывает
 * занято/свободно. Тап по свободному месту — быстрая бронь на 1 место.
 */
export default function SeatMap({ totalSeats, occupiedSeats, disabled, onTapFreeSeat }: Props) {
  const seats = Array.from({ length: totalSeats }, (_, i) => i < occupiedSeats);

  return (
    <div className="bg-[#12121c] border border-white/5 rounded-3xl p-5">
      <div className="text-center text-xs text-gray-500 mb-4">🚐 ВОДИТЕЛЬ</div>

      <div className="grid grid-cols-4 gap-3 justify-items-center max-w-xs mx-auto">
        {seats.map((occupied, i) => (
          <button
            key={i}
            type="button"
            disabled={occupied || disabled}
            onClick={onTapFreeSeat}
            aria-label={occupied ? `Место ${i + 1} занято` : `Место ${i + 1} свободно — нажмите, чтобы занять`}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-bold transition active:scale-95 ${
              occupied
                ? "bg-violet-600 text-white"
                : "bg-[#1c1c2b] text-gray-500 hover:bg-white/10 disabled:opacity-50"
            }`}
          >
            {occupied ? "●" : "○"}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-center gap-4 mt-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-violet-600 inline-block" />
          Занято
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-[#1c1c2b] inline-block" />
          Свободно
        </span>
      </div>
    </div>
  );
}
