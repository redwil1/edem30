"use client";

type SeatEntry = {
  seatNumber: number;
  booking: { id: number; passengerName: string; seats: number; source: "operator" | "edem30" } | null;
};

type Props = {
  seats: SeatEntry[];
  disabled?: boolean;
  onTapFreeSeat: (seatNumber: number) => void;
  onTapOccupiedSeat?: (bookingId: number) => void;
};

/**
 * Настоящая карта мест — каждая ячейка привязана к конкретному номеру места
 * и, если оно занято, к конкретной брони (carrier_booking_seats). Тап по
 * свободному месту бронирует именно этот номер, тап по занятому — открывает
 * действие с этой конкретной бронью (например, отмену).
 */
export default function SeatMap({ seats, disabled, onTapFreeSeat, onTapOccupiedSeat }: Props) {
  return (
    <div className="bg-[#12121c] border border-white/5 rounded-3xl p-5">
      <div className="text-center text-xs text-gray-500 mb-4">🚐 ВОДИТЕЛЬ</div>

      <div className="grid grid-cols-4 gap-3 justify-items-center max-w-xs mx-auto">
        {seats.map((seat) => {
          const occupied = seat.booking !== null;
          return (
            <button
              key={seat.seatNumber}
              type="button"
              disabled={disabled}
              onClick={() =>
                occupied && seat.booking ? onTapOccupiedSeat?.(seat.booking.id) : onTapFreeSeat(seat.seatNumber)
              }
              title={occupied ? seat.booking?.passengerName : `Место ${seat.seatNumber} свободно`}
              aria-label={
                occupied
                  ? `Место ${seat.seatNumber} занято: ${seat.booking?.passengerName}`
                  : `Место ${seat.seatNumber} свободно — нажмите, чтобы занять`
              }
              className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xs font-bold transition active:scale-95 ${
                occupied
                  ? "bg-violet-600 text-white"
                  : "bg-[#1c1c2b] text-gray-500 hover:bg-white/10 disabled:opacity-50"
              }`}
            >
              {seat.seatNumber}
            </button>
          );
        })}
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
