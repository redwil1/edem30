"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  Bus,
  Calendar,
  Eye,
  Flame,
  Loader2,
  Plus,
  Settings,
  UserCog,
  Users,
  X,
} from "lucide-react";

import BookingsTab from "./BookingsTab";
import EmployeesTab from "./EmployeesTab";

type Ride = {
  id: number;
  fromCity: string;
  toCity: string;
  rideDate: string;
  departureTime: string;
  price: number;
  vehicleId: number;
  vehicleLabel: string;
  totalSeats: number;
  occupiedSeats: number;
  freeSeats: number;
  status: string;
  driverUserId: number | null;
  driverName: string | null;
};

type Driver = { userId: number; name: string };

type Vehicle = {
  id: number;
  label: string;
  make: string | null;
  model: string | null;
  seats: number;
  active: boolean;
};

type Schedule = {
  id: number;
  vehicleId: number;
  fromCity: string;
  toCity: string;
  departureTime: string;
  daysOfWeek: string;
  price: number;
  active: boolean;
};

type Match = {
  carrierRideId: number;
  from: string;
  to: string;
  date: string;
  time: string;
  waitingCount: number;
};

type Stats = {
  views: number;
  interests: number;
  offers: number;
  ridesToday: number;
};

type Role = "manager" | "operator" | "driver";

type DashboardData = {
  carrier: { id: number; slug: string; name: string; tagline: string | null; verified: boolean; active: boolean };
  readOnly?: boolean;
  role: Role;
  rides: Ride[];
  vehicles: Vehicle[];
  schedules: Schedule[];
  drivers: Driver[];
  matches: Match[];
  stats: Stats;
};

type Tab = "today" | "rides" | "bookings" | "schedule" | "passengers" | "fleet" | "employees" | "analytics" | "settings";

const TABS: { id: Tab; label: string; icon: typeof Calendar; roles: Role[] }[] = [
  { id: "today", label: "Сегодня", icon: Calendar, roles: ["manager", "operator"] },
  { id: "rides", label: "Рейсы", icon: Bus, roles: ["manager", "operator"] },
  { id: "bookings", label: "Бронирования", icon: Plus, roles: ["manager", "operator"] },
  { id: "schedule", label: "Расписание", icon: Calendar, roles: ["manager"] },
  { id: "passengers", label: "Пассажиры", icon: Users, roles: ["manager", "operator"] },
  { id: "fleet", label: "Автопарк", icon: Bus, roles: ["manager"] },
  { id: "employees", label: "Сотрудники", icon: UserCog, roles: ["manager"] },
  { id: "analytics", label: "Аналитика", icon: BarChart3, roles: ["manager"] },
  { id: "settings", label: "Настройки", icon: Settings, roles: ["manager"] },
];

const DAY_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function dateLabel(dateStr: string) {
  if (dateStr === todayStr()) return "Сегодня";
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  if (dateStr === tomorrow) return "Завтра";
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
}

function withCarrierId(url: string, carrierId?: number) {
  if (!carrierId) return url;
  return `${url}${url.includes("?") ? "&" : "?"}carrierId=${carrierId}`;
}

export default function CarrierDashboard({
  carrierName,
  carrierId,
}: {
  carrierName: string;
  carrierId?: number;
}) {
  const [tab, setTab] = useState<Tab>("today");
  const [data, setData] = useState<DashboardData | null>(null);
  const [busyRideId, setBusyRideId] = useState<number | null>(null);
  const [offeringId, setOfferingId] = useState<number | null>(null);
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [passengersRideId, setPassengersRideId] = useState<number | null>(null);
  const [swapRideId, setSwapRideId] = useState<number | null>(null);
  const [assignDriverRideId, setAssignDriverRideId] = useState<number | null>(null);
  const [preselectedRideId, setPreselectedRideId] = useState<number | null>(null);
  const [prefillInterest, setPrefillInterest] = useState<{ userId: number; name: string; phone: string | null } | null>(
    null
  );

  const readOnly = !!data?.readOnly;

  async function load() {
    const res = await fetch(withCarrierId("/api/carrier/dashboard", carrierId), { cache: "no-store" });
    if (res.ok) setData(await res.json());
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 20000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carrierId]);

  async function offerSeats(carrierRideId: number) {
    setOfferingId(carrierRideId);

    try {
      await fetch("/api/carrier/dashboard/offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ carrierRideId }),
      });
      await load();
    } finally {
      setOfferingId(null);
    }
  }

  async function cancelRide(rideId: number) {
    if (!confirm("Отменить этот рейс? Записавшиеся пассажиры получат уведомление.")) return;

    await fetch(`/api/carrier/dashboard/rides/${rideId}/cancel`, { method: "POST" });
    await load();
  }

  async function swapVehicle(rideId: number, vehicleId: number) {
    setBusyRideId(rideId);

    try {
      const res = await fetch(`/api/carrier/dashboard/rides/${rideId}/vehicle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicleId }),
      });

      if (res.ok) {
        setSwapRideId(null);
        await load();
      } else {
        const err = await res.json().catch(() => null);
        alert(err?.error ?? "Не удалось заменить машину");
      }
    } finally {
      setBusyRideId(null);
    }
  }

  async function assignDriver(rideId: number, driverUserId: number | null) {
    setBusyRideId(rideId);

    try {
      const res = await fetch(`/api/carrier/dashboard/rides/${rideId}/driver`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driverUserId }),
      });

      if (res.ok) {
        setAssignDriverRideId(null);
        await load();
      } else {
        const err = await res.json().catch(() => null);
        alert(err?.error ?? "Не удалось назначить водителя");
      }
    } finally {
      setBusyRideId(null);
    }
  }

  if (!data) {
    return (
      <div className="py-16 flex items-center justify-center text-gray-500">
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  const todayRides = data.rides.filter((r) => r.rideDate === todayStr());
  const visibleTabs = TABS.filter((t) => t.roles.includes(data.role));

  function goToBooking(rideId: number) {
    setPreselectedRideId(rideId);
    setTab("bookings");
  }

  function bookInterest(rideId: number, interest: { userId: number; name: string; phone: string | null }) {
    setPreselectedRideId(rideId);
    setPrefillInterest(interest);
    setPassengersRideId(null);
    setTab("bookings");
  }

  return (
    <div>
      <div className="flex items-center gap-2 text-amber-400 text-xs font-bold mb-1">👑 Едем30 Business</div>
      <h1 className="text-2xl font-bold mb-1">{carrierName}</h1>
      {readOnly && (
        <p className="text-violet-400 text-sm mb-4">Режим просмотра администратором — изменения недоступны</p>
      )}
      {!readOnly && (
        <p className="text-gray-500 text-sm mb-6">
          Кабинет перевозчика · {data.role === "manager" ? "Менеджер" : "Оператор"}
        </p>
      )}

      <div className="flex gap-1 bg-[#12121c] border border-white/5 rounded-2xl p-1 mb-6 overflow-x-auto">
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
              tab === t.id ? "bg-violet-600 text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "today" && (
        <TodayTab
          data={data}
          todayRides={todayRides}
          offeringId={offeringId}
          readOnly={readOnly}
          onOffer={offerSeats}
          onAddBooking={goToBooking}
        />
      )}

      {tab === "rides" && (
        <RidesTab
          rides={data.rides}
          vehicles={data.vehicles}
          drivers={data.drivers}
          readOnly={readOnly}
          busyRideId={busyRideId}
          swapRideId={swapRideId}
          setSwapRideId={setSwapRideId}
          assignDriverRideId={assignDriverRideId}
          setAssignDriverRideId={setAssignDriverRideId}
          onCancel={cancelRide}
          onSwap={swapVehicle}
          onAssignDriver={assignDriver}
          onOpenPassengers={setPassengersRideId}
          onAddBooking={goToBooking}
        />
      )}

      {tab === "bookings" && (
        <BookingsTab
          carrierId={carrierId}
          rides={data.rides}
          readOnly={readOnly}
          preselectedRideId={preselectedRideId}
          onConsumePreselect={() => setPreselectedRideId(null)}
          prefillInterest={prefillInterest}
          onConsumePrefillInterest={() => setPrefillInterest(null)}
          onChanged={load}
        />
      )}

      {tab === "schedule" && (
        <SchedulesSection
          schedules={data.schedules}
          vehicles={data.vehicles}
          show={showScheduleForm}
          setShow={setShowScheduleForm}
          onCreated={load}
          readOnly={readOnly}
        />
      )}

      {tab === "passengers" && (
        <PassengersTab rides={data.rides} onOpen={setPassengersRideId} />
      )}

      {tab === "fleet" && (
        <VehiclesSection
          vehicles={data.vehicles}
          show={showVehicleForm}
          setShow={setShowVehicleForm}
          onCreated={load}
          readOnly={readOnly}
        />
      )}

      {tab === "employees" && <EmployeesTab carrierId={carrierId} readOnly={readOnly} />}

      {tab === "analytics" && <AnalyticsTab carrierId={carrierId} />}

      {tab === "settings" && <SettingsTab carrier={data.carrier} />}

      {passengersRideId !== null && (
        <PassengersModal
          ride={data.rides.find((r) => r.id === passengersRideId) ?? null}
          onClose={() => setPassengersRideId(null)}
          readOnly={readOnly}
          onCancelled={load}
          onBookInterest={bookInterest}
        />
      )}
    </div>
  );
}

function TodayTab({
  data,
  todayRides,
  offeringId,
  readOnly,
  onOffer,
  onAddBooking,
}: {
  data: DashboardData;
  todayRides: Ride[];
  offeringId: number | null;
  readOnly: boolean;
  onOffer: (carrierRideId: number) => void;
  onAddBooking: (rideId: number) => void;
}) {
  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <div className="bg-[#12121c] border border-white/5 rounded-2xl p-4">
          <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-2">
            <Eye size={13} />
            Просмотров сегодня
          </div>
          <div className="text-xl font-bold">{data.stats.views}</div>
        </div>
        <div className="bg-[#12121c] border border-white/5 rounded-2xl p-4">
          <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-2">
            <Users size={13} />
            Заявок сегодня
          </div>
          <div className="text-xl font-bold">{data.stats.interests + data.stats.offers}</div>
        </div>
        <div className="bg-[#12121c] border border-white/5 rounded-2xl p-4 col-span-2 sm:col-span-2">
          <div className="text-gray-500 text-xs mb-2">Рейсов сегодня</div>
          <div className="text-xl font-bold">{data.stats.ridesToday}</div>
        </div>
      </div>

      {!readOnly && data.matches.length > 0 && (
        <div className="mb-8 space-y-3">
          {data.matches.map((m) => (
            <div key={m.carrierRideId} className="bg-[#171726] border border-amber-500/30 rounded-3xl p-5">
              <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold mb-2">
                <Flame size={14} />
                Подходящая заявка
              </div>
              <div className="font-bold">
                {m.waitingCount} {m.waitingCount === 1 ? "пассажир ищет" : "пассажира ищут"} поездку
              </div>
              <div className="text-gray-400 text-sm mt-1">
                {m.from} → {m.to} · {dateLabel(m.date)} {m.time}
              </div>

              <button
                type="button"
                onClick={() => onOffer(m.carrierRideId)}
                disabled={offeringId === m.carrierRideId}
                className="btn-gradient rounded-xl px-5 py-2.5 text-sm font-bold mt-3 disabled:opacity-60"
              >
                {offeringId === m.carrierRideId ? "..." : "Предложить места"}
              </button>
            </div>
          ))}
        </div>
      )}

      <h2 className="text-lg font-bold mb-3">Сегодня</h2>
      <RideList rides={todayRides} readOnly={readOnly} onAddBooking={onAddBooking} />

      {data.rides.length === 0 && (
        <div className="bg-[#12121c] border border-white/5 rounded-3xl p-6 text-center text-gray-500">
          Рейсов пока нет — добавьте машину и регулярное расписание во вкладке «Расписание».
        </div>
      )}
    </div>
  );
}

function RidesTab({
  rides,
  vehicles,
  drivers,
  readOnly,
  busyRideId,
  swapRideId,
  setSwapRideId,
  assignDriverRideId,
  setAssignDriverRideId,
  onCancel,
  onSwap,
  onAssignDriver,
  onOpenPassengers,
  onAddBooking,
}: {
  rides: Ride[];
  vehicles: Vehicle[];
  drivers: Driver[];
  readOnly: boolean;
  busyRideId: number | null;
  swapRideId: number | null;
  setSwapRideId: (id: number | null) => void;
  assignDriverRideId: number | null;
  setAssignDriverRideId: (id: number | null) => void;
  onCancel: (rideId: number) => void;
  onSwap: (rideId: number, vehicleId: number) => void;
  onAssignDriver: (rideId: number, driverUserId: number | null) => void;
  onOpenPassengers: (rideId: number) => void;
  onAddBooking: (rideId: number) => void;
}) {
  const grouped = rides.reduce<Record<string, Ride[]>>((acc, r) => {
    (acc[r.rideDate] ??= []).push(r);
    return acc;
  }, {});

  const dates = Object.keys(grouped).sort();

  if (dates.length === 0) {
    return <div className="text-gray-500 text-sm">Рейсов пока нет</div>;
  }

  return (
    <div className="space-y-8">
      {dates.map((date) => (
        <div key={date}>
          <h2 className="text-lg font-bold mb-3">{dateLabel(date)}</h2>

          <div className="space-y-3">
            {grouped[date].map((ride) => (
              <div key={ride.id} className="bg-[#12121c] border border-white/5 rounded-3xl p-5">
                <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
                  <div>
                    <div className="text-violet-400 font-bold">{ride.departureTime}</div>
                    <div className="font-medium">
                      {ride.fromCity} → {ride.toCity}
                    </div>
                    <div className="text-gray-500 text-xs mt-0.5">
                      {ride.vehicleLabel} · {ride.occupiedSeats}/{ride.totalSeats} мест
                    </div>
                    <div className="text-xs mt-0.5">
                      {ride.driverName ? (
                        <span className="text-violet-300">🧑‍✈️ {ride.driverName}</span>
                      ) : (
                        <span className="text-amber-400">⚠ Водитель не назначен</span>
                      )}
                    </div>
                  </div>

                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      ride.status === "cancelled"
                        ? "bg-gray-500/15 text-gray-400"
                        : ride.status === "full"
                        ? "bg-red-500/15 text-red-400"
                        : "bg-green-500/15 text-green-400"
                    }`}
                  >
                    {ride.status === "cancelled" ? "Отменён" : ride.status === "full" ? "Мест нет" : "Открыт"}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <button
                    type="button"
                    onClick={() => onOpenPassengers(ride.id)}
                    className="px-3 py-2 rounded-xl bg-[#1c1c2b] hover:bg-white/10 transition font-medium"
                  >
                    Пассажиры
                  </button>

                  {!readOnly && ride.status !== "cancelled" && (
                    <>
                      <button
                        type="button"
                        onClick={() => onAddBooking(ride.id)}
                        disabled={ride.freeSeats <= 0}
                        className="px-3 py-2 rounded-xl bg-violet-600/15 text-violet-300 hover:bg-violet-600/25 transition font-medium disabled:opacity-40"
                      >
                        + Бронь
                      </button>

                      <button
                        type="button"
                        onClick={() => setAssignDriverRideId(assignDriverRideId === ride.id ? null : ride.id)}
                        className="px-3 py-2 rounded-xl bg-[#1c1c2b] hover:bg-white/10 transition font-medium"
                      >
                        {ride.driverName ? "Сменить водителя" : "Назначить водителя"}
                      </button>

                      <button
                        type="button"
                        onClick={() => setSwapRideId(swapRideId === ride.id ? null : ride.id)}
                        className="px-3 py-2 rounded-xl bg-[#1c1c2b] hover:bg-white/10 transition font-medium"
                      >
                        Заменить машину
                      </button>

                      <button
                        type="button"
                        onClick={() => onCancel(ride.id)}
                        className="px-3 py-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition font-medium"
                      >
                        Отменить рейс
                      </button>
                    </>
                  )}
                </div>

                {assignDriverRideId === ride.id && (
                  <div className="flex gap-2 flex-wrap mt-3">
                    {drivers
                      .filter((d) => d.userId !== ride.driverUserId)
                      .map((d) => (
                        <button
                          key={d.userId}
                          type="button"
                          onClick={() => onAssignDriver(ride.id, d.userId)}
                          disabled={busyRideId === ride.id}
                          className="px-3 py-2 rounded-xl bg-violet-600/15 text-violet-300 hover:bg-violet-600/25 transition text-xs font-medium disabled:opacity-50"
                        >
                          {d.name}
                        </button>
                      ))}
                    {drivers.length === 0 && (
                      <span className="text-gray-500 text-xs">
                        Нет сотрудников с ролью «Водитель» — добавьте во вкладке «Сотрудники»
                      </span>
                    )}
                  </div>
                )}

                {swapRideId === ride.id && (
                  <div className="flex gap-2 flex-wrap mt-3">
                    {vehicles
                      .filter((v) => v.active && v.id !== ride.vehicleId)
                      .map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => onSwap(ride.id, v.id)}
                          className="px-3 py-2 rounded-xl bg-violet-600/15 text-violet-300 hover:bg-violet-600/25 transition text-xs font-medium"
                        >
                          {v.label} ({v.seats} мест)
                        </button>
                      ))}
                    {vehicles.filter((v) => v.active && v.id !== ride.vehicleId).length === 0 && (
                      <span className="text-gray-500 text-xs">Нет других активных машин</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function PassengersTab({ rides, onOpen }: { rides: Ride[]; onOpen: (rideId: number) => void }) {
  const upcoming = [...rides]
    .filter((r) => r.status !== "cancelled")
    .sort((a, b) => (a.rideDate + a.departureTime).localeCompare(b.rideDate + b.departureTime));

  if (upcoming.length === 0) {
    return <div className="text-gray-500 text-sm">Рейсов пока нет</div>;
  }

  return (
    <div className="space-y-2">
      {upcoming.map((ride) => (
        <button
          key={ride.id}
          type="button"
          onClick={() => onOpen(ride.id)}
          className="w-full flex items-center justify-between gap-3 bg-[#12121c] border border-white/5 rounded-2xl px-4 py-3 text-left hover:border-violet-500/30 transition"
        >
          <div>
            <div className="text-sm font-medium">
              {dateLabel(ride.rideDate)} {ride.departureTime} · {ride.fromCity} → {ride.toCity}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              {ride.occupiedSeats}/{ride.totalSeats} занято
            </div>
          </div>
          <Users size={16} className="text-gray-500 shrink-0" />
        </button>
      ))}
    </div>
  );
}

type ModalBooking = {
  id: number;
  seats: number;
  passengerName: string;
  passengerPhone: string | null;
  pickup: string | null;
  dropoff: string | null;
  comment: string | null;
  source: "operator" | "edem30";
  userId: number | null;
};

function PassengersModal({
  ride,
  onClose,
  readOnly,
  onCancelled,
  onBookInterest,
}: {
  ride: Ride | null;
  onClose: () => void;
  readOnly: boolean;
  onCancelled: () => void;
  onBookInterest: (rideId: number, interest: { userId: number; name: string; phone: string | null }) => void;
}) {
  const [bookings, setBookings] = useState<ModalBooking[] | null>(null);
  const [interests, setInterests] = useState<{ id: number; name: string; phone: string | null }[] | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  function load() {
    if (!ride) return;
    fetch(`/api/carrier/dashboard/rides/${ride.id}/passengers`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        setBookings(data.bookings ?? []);
        setInterests(data.interests ?? []);
      });
  }

  useEffect(() => {
    setBookings(null);
    setInterests(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ride]);

  if (!ride) return null;

  async function cancelBooking(bookingId: number) {
    setCancellingId(bookingId);
    try {
      const res = await fetch(`/api/carrier/dashboard/bookings/${bookingId}/cancel`, { method: "POST" });
      if (res.ok) {
        load();
        onCancelled();
      }
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-5" onClick={onClose}>
      <div
        className="bg-[#171726] border border-white/10 rounded-3xl p-6 w-full max-w-sm max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="font-display font-bold">
              {ride.fromCity} → {ride.toCity}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              {dateLabel(ride.rideDate)} {ride.departureTime} · {ride.occupiedSeats}/{ride.totalSeats} мест
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-white/5 transition shrink-0"
            aria-label="Закрыть"
          >
            <X size={16} />
          </button>
        </div>

        <div className="text-xs text-gray-500 mb-2">Пассажиры (подтверждённая бронь):</div>

        {!bookings ? (
          <div className="py-8 flex items-center justify-center text-gray-500">
            <Loader2 size={18} className="animate-spin" />
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-gray-500 text-sm py-3">Пока никто не забронирован</div>
        ) : (
          <div className="space-y-2 mb-4">
            {bookings.map((b) => (
              <div key={b.id} className="bg-[#1c1c2b] rounded-xl px-4 py-2.5 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium">
                    {b.passengerName} <span className="text-gray-500 font-normal">· {b.seats} мест</span>
                  </div>
                  <span
                    className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap ${
                      b.source === "edem30" ? "bg-violet-600/20 text-violet-300" : "bg-white/10 text-gray-400"
                    }`}
                  >
                    {b.source === "edem30" ? "🌐 Едем30" : "📞 Оператор"}
                  </span>
                </div>
                {b.passengerPhone && <div className="text-gray-500 text-xs mt-1">📞 {b.passengerPhone}</div>}
                {(b.pickup || b.dropoff) && (
                  <div className="text-gray-500 text-xs mt-0.5">
                    {b.pickup && `Откуда: ${b.pickup}`}
                    {b.pickup && b.dropoff && " · "}
                    {b.dropoff && `Куда: ${b.dropoff}`}
                  </div>
                )}
                {b.comment && <div className="text-gray-500 text-xs mt-0.5">💬 {b.comment}</div>}

                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => cancelBooking(b.id)}
                    disabled={cancellingId === b.id}
                    className="text-red-400 hover:text-red-300 text-xs font-medium mt-2 disabled:opacity-50"
                  >
                    Отменить бронь
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {interests && interests.length > 0 && (
          <>
            <div className="text-xs text-gray-500 mb-2">Хотят поехать (не подтверждено):</div>
            <div className="space-y-2">
              {interests.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-2 bg-[#1c1c2b]/60 rounded-xl px-4 py-2 text-sm text-gray-400"
                >
                  {p.name}
                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => onBookInterest(ride.id, { userId: p.id, name: p.name, phone: p.phone })}
                      className="text-violet-400 hover:text-violet-300 text-xs font-medium shrink-0"
                    >
                      Оформить бронь →
                    </button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function RideList({
  rides,
  readOnly,
  onAddBooking,
}: {
  rides: Ride[];
  readOnly: boolean;
  onAddBooking: (rideId: number) => void;
}) {
  if (rides.length === 0) {
    return <div className="text-gray-500 text-sm mb-6">Рейсов нет</div>;
  }

  return (
    <div className="space-y-3 mb-6">
      {rides.map((ride) => (
        <div key={ride.id} className="bg-[#12121c] border border-white/5 rounded-3xl p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <div>
              <div className="text-violet-400 font-bold">{ride.departureTime}</div>
              <div className="font-medium">
                {ride.fromCity} → {ride.toCity}
              </div>
              <div className="text-gray-500 text-xs mt-0.5">
                {ride.vehicleLabel} · {ride.totalSeats} мест
              </div>
            </div>

            {ride.status === "full" && (
              <span className="text-xs font-medium text-red-400 bg-red-500/15 rounded-full px-2.5 py-1">
                Мест нет
              </span>
            )}
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-gray-400">
              Занято: <span className="text-white font-bold">{ride.occupiedSeats}</span> · Свободно:{" "}
              <span className="text-white font-bold">{ride.freeSeats}</span>
            </div>

            {!readOnly && (
              <button
                type="button"
                onClick={() => onAddBooking(ride.id)}
                disabled={ride.freeSeats <= 0}
                className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 transition rounded-xl px-4 py-2.5 text-sm font-bold"
              >
                <Plus size={16} />
                Бронь
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function VehiclesSection({
  vehicles,
  show,
  setShow,
  onCreated,
  readOnly,
}: {
  vehicles: Vehicle[];
  show: boolean;
  setShow: (v: boolean) => void;
  onCreated: () => void;
  readOnly: boolean;
}) {
  const [label, setLabel] = useState("");
  const [seats, setSeats] = useState("20");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch("/api/carrier/dashboard/vehicles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, seats: Number(seats) }),
      });

      if (res.ok) {
        setLabel("");
        setSeats("20");
        setShow(false);
        onCreated();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-[#12121c] border border-white/5 rounded-3xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold">🚐 Автопарк</h3>
        {!readOnly && (
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="text-xs font-medium text-violet-400 hover:text-violet-300"
          >
            {show ? "Отмена" : "+ Добавить"}
          </button>
        )}
      </div>

      <div className="space-y-2 mb-3">
        {vehicles.map((v) => (
          <div key={v.id} className="flex items-center justify-between bg-[#171726] rounded-xl px-4 py-2.5 text-sm">
            <span>
              {v.label} · {v.seats} мест
            </span>
            {!v.active && <span className="text-gray-500 text-xs">неактивна</span>}
          </div>
        ))}
        {vehicles.length === 0 && <div className="text-gray-500 text-sm">Машин ещё нет</div>}
      </div>

      {show && (
        <form onSubmit={submit} className="flex gap-2 flex-wrap">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Название (Mercedes Sprinter №1)"
            required
            className="flex-1 min-w-[180px] bg-[#1c1c2b] rounded-xl px-3 py-2.5 text-sm outline-none"
          />
          <input
            value={seats}
            onChange={(e) => setSeats(e.target.value)}
            type="number"
            min={1}
            max={50}
            required
            className="w-20 bg-[#1c1c2b] rounded-xl px-3 py-2.5 text-sm outline-none"
          />
          <button
            type="submit"
            disabled={saving}
            className="btn-gradient rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-60"
          >
            Сохранить
          </button>
        </form>
      )}
    </div>
  );
}

function SchedulesSection({
  schedules,
  vehicles,
  show,
  setShow,
  onCreated,
  readOnly,
}: {
  schedules: Schedule[];
  vehicles: Vehicle[];
  show: boolean;
  setShow: (v: boolean) => void;
  onCreated: () => void;
  readOnly: boolean;
}) {
  const [vehicleId, setVehicleId] = useState<number | "">("");
  const [fromCity, setFromCity] = useState("");
  const [toCity, setToCity] = useState("");
  const [time, setTime] = useState("06:00");
  const [price, setPrice] = useState("550");
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 7]);
  const [saving, setSaving] = useState(false);

  function toggleDay(day: number) {
    setDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!vehicleId) return;

    setSaving(true);

    try {
      const res = await fetch("/api/carrier/dashboard/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId,
          fromCity,
          toCity,
          departureTime: time,
          price: Number(price),
          daysOfWeek: days,
        }),
      });

      if (res.ok) {
        setFromCity("");
        setToCity("");
        setShow(false);
        onCreated();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-[#12121c] border border-white/5 rounded-3xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold">Регулярное расписание</h3>
        {!readOnly && (
          <button
            type="button"
            onClick={() => setShow(!show)}
            disabled={vehicles.length === 0}
            className="text-xs font-medium text-violet-400 hover:text-violet-300 disabled:opacity-40"
          >
            {show ? "Отмена" : "+ Добавить"}
          </button>
        )}
      </div>

      <div className="space-y-2 mb-3">
        {schedules.map((s) => (
          <div key={s.id} className="flex items-center justify-between bg-[#171726] rounded-xl px-4 py-2.5 text-sm">
            <span>
              {s.fromCity} → {s.toCity} · {s.departureTime} · {s.price} ₽
            </span>
            {!s.active && <span className="text-gray-500 text-xs">неактивно</span>}
          </div>
        ))}
        {schedules.length === 0 && <div className="text-gray-500 text-sm">Расписания ещё нет</div>}
      </div>

      {vehicles.length === 0 && <div className="text-gray-500 text-xs">Сначала добавьте машину во вкладке «Автопарк»</div>}

      {show && (
        <form onSubmit={submit} className="space-y-2">
          <div className="flex gap-2 flex-wrap">
            <input
              value={fromCity}
              onChange={(e) => setFromCity(e.target.value)}
              placeholder="Откуда"
              required
              className="flex-1 min-w-[120px] bg-[#1c1c2b] rounded-xl px-3 py-2.5 text-sm outline-none"
            />
            <input
              value={toCity}
              onChange={(e) => setToCity(e.target.value)}
              placeholder="Куда"
              required
              className="flex-1 min-w-[120px] bg-[#1c1c2b] rounded-xl px-3 py-2.5 text-sm outline-none"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            <input
              value={time}
              onChange={(e) => setTime(e.target.value)}
              type="time"
              required
              className="bg-[#1c1c2b] rounded-xl px-3 py-2.5 text-sm outline-none"
            />
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              type="number"
              min={1}
              placeholder="Цена, ₽"
              required
              className="w-28 bg-[#1c1c2b] rounded-xl px-3 py-2.5 text-sm outline-none"
            />
            <select
              value={vehicleId}
              onChange={(e) => setVehicleId(Number(e.target.value))}
              required
              className="flex-1 min-w-[140px] bg-[#1c1c2b] rounded-xl px-3 py-2.5 text-sm outline-none"
            >
              <option value="">Машина</option>
              {vehicles
                .filter((v) => v.active)
                .map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
            </select>
          </div>

          <div className="flex gap-1.5 flex-wrap">
            {DAY_LABELS.map((label, i) => {
              const day = i + 1;
              const active = days.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`w-10 h-10 rounded-xl text-xs font-medium transition ${
                    active ? "bg-violet-600 text-white" : "bg-[#1c1c2b] text-gray-400"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <button
            type="submit"
            disabled={saving || days.length === 0}
            className="btn-gradient rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-60"
          >
            Сохранить
          </button>
        </form>
      )}
    </div>
  );
}

type Analytics = {
  today: {
    rides: number;
    passengers: number;
    avgLoadPct: number | null;
    requests: number;
    estimatedRevenue: number;
    bookingsBySource: { operator: number; edem30: number };
  };
  byRide: { label: string; avgLoadPct: number; sampleCount: number }[];
  byVehicle: { label: string; avgLoadPct: number; sampleCount: number }[];
  byWeekday: { label: string; avgLoadPct: number; sampleCount: number }[];
  minSamples: number;
  recommendations: { type: "hot" | "low"; label: string; loadPct: number }[];
};

function LoadBar({ label, pct, sampleCount, minSamples }: { label: string; pct: number; sampleCount: number; minSamples: number }) {
  if (sampleCount < minSamples) {
    return (
      <div className="flex items-center justify-between gap-3 py-2 text-sm">
        <span className="text-gray-400">{label}</span>
        <span className="text-gray-600 text-xs">Недостаточно данных</span>
      </div>
    );
  }

  return (
    <div className="py-2">
      <div className="flex items-center justify-between gap-3 text-sm mb-1.5">
        <span className="text-gray-300">{label}</span>
        <span className="font-bold">{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-[#1c1c2b] overflow-hidden">
        <div
          className={`h-full rounded-full ${pct >= 85 ? "bg-orange-500" : pct <= 40 ? "bg-gray-500" : "bg-violet-500"}`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  );
}

function AnalyticsTab({ carrierId }: { carrierId?: number }) {
  const [data, setData] = useState<Analytics | null>(null);

  useEffect(() => {
    fetch(withCarrierId("/api/carrier/dashboard/analytics", carrierId), { cache: "no-store" })
      .then((res) => res.json())
      .then(setData);
  }, [carrierId]);

  if (!data) {
    return (
      <div className="py-16 flex items-center justify-center text-gray-500">
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#12121c] border border-white/5 rounded-2xl p-4">
          <div className="text-gray-500 text-xs mb-2">Рейсов сегодня</div>
          <div className="text-xl font-bold">{data.today.rides}</div>
        </div>
        <div className="bg-[#12121c] border border-white/5 rounded-2xl p-4">
          <div className="text-gray-500 text-xs mb-2">Пассажиров сегодня</div>
          <div className="text-xl font-bold">{data.today.passengers}</div>
        </div>
        <div className="bg-[#12121c] border border-white/5 rounded-2xl p-4">
          <div className="text-gray-500 text-xs mb-2">Средняя загрузка</div>
          <div className="text-xl font-bold">{data.today.avgLoadPct !== null ? `${data.today.avgLoadPct}%` : "—"}</div>
        </div>
        <div className="bg-[#12121c] border border-white/5 rounded-2xl p-4">
          <div className="text-gray-500 text-xs mb-2">Заявок сегодня</div>
          <div className="text-xl font-bold">{data.today.requests}</div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap text-xs text-gray-500 px-1">
        <span>
          Расчётная выручка сегодня (места броней × цена, не факт оплаты):{" "}
          <span className="text-gray-300 font-medium">
            {new Intl.NumberFormat("ru-RU").format(data.today.estimatedRevenue)} ₽
          </span>
        </span>
        <span>
          📞 Оператор: {data.today.bookingsBySource.operator} · 🌐 Едем30: {data.today.bookingsBySource.edem30}
        </span>
      </div>

      {data.recommendations.length > 0 && (
        <div className="space-y-3">
          {data.recommendations.map((r, i) => (
            <div
              key={i}
              className={`rounded-3xl p-4 border ${
                r.type === "hot" ? "bg-orange-500/10 border-orange-500/30" : "bg-[#171726] border-white/5"
              }`}
            >
              <div className="flex items-center gap-1.5 text-sm font-bold mb-1">
                {r.type === "hot" ? "🔥 Рекомендация" : "💡 Рекомендация"}
              </div>
              <div className="text-sm text-gray-300">
                {r.type === "hot"
                  ? `Рейс ${r.label} в среднем загружен на ${r.loadPct}%. Можно рассмотреть увеличение количества машин.`
                  : `Рейс ${r.label} имеет среднюю загрузку ${r.loadPct}%. Можно проверить востребованность этого времени.`}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-[#12121c] border border-white/5 rounded-3xl p-5">
        <h3 className="font-bold mb-2">Загрузка по рейсам</h3>
        {data.byRide.length === 0 ? (
          <div className="text-gray-500 text-sm py-4">Недостаточно данных</div>
        ) : (
          data.byRide.map((s) => (
            <LoadBar key={s.label} label={s.label} pct={s.avgLoadPct} sampleCount={s.sampleCount} minSamples={data.minSamples} />
          ))
        )}
      </div>

      <div className="bg-[#12121c] border border-white/5 rounded-3xl p-5">
        <h3 className="font-bold mb-2">Загрузка по машинам</h3>
        {data.byVehicle.length === 0 ? (
          <div className="text-gray-500 text-sm py-4">Недостаточно данных</div>
        ) : (
          data.byVehicle.map((s) => (
            <LoadBar key={s.label} label={s.label} pct={s.avgLoadPct} sampleCount={s.sampleCount} minSamples={data.minSamples} />
          ))
        )}
      </div>

      <div className="bg-[#12121c] border border-white/5 rounded-3xl p-5">
        <h3 className="font-bold mb-2">Загрузка по дням недели</h3>
        {data.byWeekday.length === 0 ? (
          <div className="text-gray-500 text-sm py-4">Недостаточно данных</div>
        ) : (
          data.byWeekday.map((s) => (
            <LoadBar key={s.label} label={s.label} pct={s.avgLoadPct} sampleCount={s.sampleCount} minSamples={data.minSamples} />
          ))
        )}
      </div>
    </div>
  );
}

function SettingsTab({ carrier }: { carrier: DashboardData["carrier"] }) {
  return (
    <div className="bg-[#12121c] border border-white/5 rounded-3xl p-5 space-y-4">
      <div>
        <div className="text-gray-500 text-xs mb-1">Название</div>
        <div className="font-medium">{carrier.name}</div>
      </div>
      <div>
        <div className="text-gray-500 text-xs mb-1">Публичная страница</div>
        <a href={`/carrier/${carrier.slug}`} target="_blank" className="text-violet-400 font-medium hover:text-violet-300">
          edem30.ru/carrier/{carrier.slug}
        </a>
      </div>
      <div>
        <div className="text-gray-500 text-xs mb-1">Статус</div>
        <span
          className={`inline-flex text-xs font-medium px-2.5 py-1 rounded-full ${
            carrier.active ? "bg-green-500/15 text-green-400" : "bg-gray-500/15 text-gray-400"
          }`}
        >
          {carrier.active ? "Активен" : "Отключён администратором"}
        </span>
      </div>
      <p className="text-gray-500 text-xs">
        Изменение названия, тарифного плана и статуса VIP-партнёра — через администратора Едем30.
      </p>
    </div>
  );
}
