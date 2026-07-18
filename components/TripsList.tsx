type Trip = {
  id: number;
  from: string;
  to: string;
  time: string;
  price: string;
  seats: number;
  driver: string;
  rating: number;
};

const trips: Trip[] = [
  {
    id: 1,
    from: "Харабали",
    to: "Астрахань",
    time: "06:00",
    price: "700 ₽",
    seats: 2,
    driver: "ИП Лаптевы",
    rating: 5,
  },
  {
    id: 2,
    from: "Харабали",
    to: "Астрахань",
    time: "08:30",
    price: "700 ₽",
    seats: 4,
    driver: "Александр",
    rating: 4.8,
  },
  {
    id: 3,
    from: "Астрахань",
    to: "Харабали",
    time: "15:00",
    price: "700 ₽",
    seats: 1,
    driver: "Сергей",
    rating: 4.9,
  },
];

export default function TripsList() {
  return (
    <div className="mt-8">
      <h2 className="text-xl font-bold mb-4">Найденные поездки</h2>

      <div className="space-y-4">
        {trips.map((trip) => (
          <div
            key={trip.id}
            className="bg-[#171726] rounded-3xl p-5 border border-violet-500/10"
          >
            <div className="flex justify-between">
              <div>
                <div className="text-lg font-semibold">
                  {trip.from} → {trip.to}
                </div>

                <div className="text-gray-400 mt-1">{trip.time}</div>
              </div>

              <div className="text-right">
                <div className="text-violet-400 font-bold text-xl">
                  {trip.price}
                </div>

                <div className="text-sm text-gray-400">{trip.seats} места</div>
              </div>
            </div>

            <div className="mt-4 flex justify-between items-center">
              <div>
                <div className="font-medium">{trip.driver}</div>

                <div className="text-yellow-400">⭐ {trip.rating}</div>
              </div>

              <button className="bg-violet-600 hover:bg-violet-700 px-5 py-2 rounded-xl transition">
                Подробнее
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
