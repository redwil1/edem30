"use client";

import { useEffect, useState } from "react";
import { Eye, Flame, Loader2, Minus, Plus, Users } from "lucide-react";

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
};

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

type DashboardData = {
  rides: Ride[];
  vehicles: Vehicle[];
  schedules: Schedule[];
  matches: Match[];
  stats: Stats;
};

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

export default function CarrierDashboard({ carrierName }: { carrierName: string }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [busyRideId, setBusyRideId] = useState<number | null>(null);
  const [offeringId, setOfferingId] = useState<number | null>(null);
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [showScheduleForm, setShowScheduleForm] = useState(false);

  async function load() {
    const res = await fetch("/api/carrier/dashboard", { cache: "no-store" });
    if (res.ok) setData(await res.json());
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 20000);
    return () => clearInterval(interval);
  }, []);

  async function changeSeats(rideId: number, delta: 1 | -1) {
    setBusyRideId(rideId);

    try {
      const res = await fetch(`/api/carrier/dashboard/rides/${rideId}/seats`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delta }),
      });

      if (res.ok) {
        const result = await res.json();
        setData((prev) =>
          prev
            ? {
                ...prev,
                rides: prev.rides.map((r) =>
                  r.id === rideId
                    ? { ...r, occupiedSeats: result.occupiedSeats, freeSeats: result.freeSeats, status: result.status }
                    : r
                ),
              }
            : prev
        );
      }
    } finally {
      setBusyRideId(null);
    }
  }

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

  if (!data) {
    return (
      <div className="py-16 flex items-center justify-center text-gray-500">
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  const todayRides = data.rides.filter((r) => r.rideDate === todayStr());
  const otherRides = data.rides.filter((r) => r.rideDate !== todayStr());

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">{carrierName}</h1>
      <p className="text-gray-500 text-sm mb-6">Кабинет перевозчика</p>

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

      {data.matches.length > 0 && (
        <div className="mb-8 space-y-3">
          {data.matches.map((m) => (
            <div
              key={m.carrierRideId}
              className="bg-[#171726] border border-amber-500/30 rounded-3xl p-5"
            >
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
                onClick={() => offerSeats(m.carrierRideId)}
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
      <RideList rides={todayRides} busyRideId={busyRideId} onChange={changeSeats} />

      {otherRides.length > 0 && (
        <>
          <h2 className="text-lg font-bold mb-3 mt-8">Завтра</h2>
          <RideList rides={otherRides} busyRideId={busyRideId} onChange={changeSeats} />
        </>
      )}

      {data.rides.length === 0 && (
        <div className="bg-[#12121c] border border-white/5 rounded-3xl p-6 text-center text-gray-500">
          Рейсов пока нет — добавьте машину и регулярное расписание ниже.
        </div>
      )}

      <div className="mt-10 space-y-6">
        <VehiclesSection
          vehicles={data.vehicles}
          show={showVehicleForm}
          setShow={setShowVehicleForm}
          onCreated={load}
        />

        <SchedulesSection
          schedules={data.schedules}
          vehicles={data.vehicles}
          show={showScheduleForm}
          setShow={setShowScheduleForm}
          onCreated={load}
        />
      </div>
    </div>
  );
}

function RideList({
  rides,
  busyRideId,
  onChange,
}: {
  rides: Ride[];
  busyRideId: number | null;
  onChange: (rideId: number, delta: 1 | -1) => void;
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

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onChange(ride.id, -1)}
                disabled={busyRideId === ride.id || ride.occupiedSeats <= 0}
                aria-label="Убрать пассажира"
                className="w-14 h-14 rounded-2xl bg-[#1c1c2b] hover:bg-white/10 disabled:opacity-30 flex items-center justify-center transition active:scale-95"
              >
                <Minus size={22} />
              </button>

              <div className="w-10 text-center font-bold text-xl">{ride.occupiedSeats}</div>

              <button
                type="button"
                onClick={() => onChange(ride.id, 1)}
                disabled={busyRideId === ride.id || ride.freeSeats <= 0}
                aria-label="Добавить пассажира"
                className="w-14 h-14 rounded-2xl bg-violet-600 hover:bg-violet-700 disabled:opacity-30 flex items-center justify-center transition active:scale-95"
              >
                <Plus size={22} />
              </button>
            </div>
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
}: {
  vehicles: Vehicle[];
  show: boolean;
  setShow: (v: boolean) => void;
  onCreated: () => void;
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
        <h3 className="font-bold">Машины</h3>
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="text-xs font-medium text-violet-400 hover:text-violet-300"
        >
          {show ? "Отмена" : "+ Добавить"}
        </button>
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
}: {
  schedules: Schedule[];
  vehicles: Vehicle[];
  show: boolean;
  setShow: (v: boolean) => void;
  onCreated: () => void;
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
        <button
          type="button"
          onClick={() => setShow(!show)}
          disabled={vehicles.length === 0}
          className="text-xs font-medium text-violet-400 hover:text-violet-300 disabled:opacity-40"
        >
          {show ? "Отмена" : "+ Добавить"}
        </button>
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

      {vehicles.length === 0 && (
        <div className="text-gray-500 text-xs">Сначала добавьте машину</div>
      )}

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
