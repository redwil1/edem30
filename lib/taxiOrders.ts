import "server-only";

import { db } from "@/lib/db";
import { createTrip } from "@/lib/trips";

export type TaxiOrderStatus = "open" | "accepted" | "cancelled";

export type TaxiOrder = {
  id: number;
  from: string;
  to: string;
  price: number;
  seats: number;
  status: TaxiOrderStatus;
  passengerId: number;
  passengerName: string;
  tripId: number | null;
  createdAt: string;
};

type OrderRow = {
  id: number;
  passenger_id: number;
  passenger_name: string;
  from_address: string;
  to_address: string;
  price: number;
  seats: number;
  status: TaxiOrderStatus;
  trip_id: number | null;
  created_at: string;
};

const SELECT_BASE = `
  SELECT
    taxi_orders.id as id,
    taxi_orders.passenger_id as passenger_id,
    users.name as passenger_name,
    taxi_orders.from_address as from_address,
    taxi_orders.to_address as to_address,
    taxi_orders.price as price,
    taxi_orders.seats as seats,
    taxi_orders.status as status,
    taxi_orders.trip_id as trip_id,
    taxi_orders.created_at as created_at
  FROM taxi_orders
  JOIN users ON users.id = taxi_orders.passenger_id
`;

function toOrder(row: OrderRow): TaxiOrder {
  return {
    id: row.id,
    from: row.from_address,
    to: row.to_address,
    price: row.price,
    seats: row.seats,
    status: row.status,
    passengerId: row.passenger_id,
    passengerName: row.passenger_name,
    tripId: row.trip_id,
    createdAt: row.created_at,
  };
}

export type CreateOrderInput = {
  from: string;
  to: string;
  price: number;
  seats: number;
};

export function createOrder(
  input: CreateOrderInput,
  passenger: { id: number }
): number {
  const result = db
    .prepare(
      `INSERT INTO taxi_orders (passenger_id, from_address, to_address, price, seats)
       VALUES (@passengerId, @from, @to, @price, @seats)`
    )
    .run({
      passengerId: passenger.id,
      from: input.from,
      to: input.to,
      price: input.price,
      seats: input.seats,
    });

  return Number(result.lastInsertRowid);
}

export function listOpenOrders(excludeUserId: number): TaxiOrder[] {
  const rows = db
    .prepare(
      `${SELECT_BASE}
       WHERE taxi_orders.status = 'open' AND taxi_orders.passenger_id != ?
       ORDER BY taxi_orders.created_at DESC`
    )
    .all(excludeUserId) as OrderRow[];

  return rows.map(toOrder);
}

export function getLatestOrderForPassenger(
  passengerId: number
): TaxiOrder | undefined {
  const row = db
    .prepare(
      `${SELECT_BASE}
       WHERE taxi_orders.passenger_id = ? AND taxi_orders.status IN ('open', 'accepted')
       ORDER BY taxi_orders.created_at DESC
       LIMIT 1`
    )
    .get(passengerId) as OrderRow | undefined;

  return row ? toOrder(row) : undefined;
}

function currentTimeHHMM(): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export type AcceptOrderResult =
  | { ok: true; tripId: number }
  | { ok: false; reason: "not_found" | "self" };

export function acceptOrder(
  orderId: number,
  driver: { id: number; name: string }
): AcceptOrderResult {
  const tx = db.transaction((): AcceptOrderResult => {
    const order = db
      .prepare("SELECT * FROM taxi_orders WHERE id = ? AND status = 'open'")
      .get(orderId) as
      | {
          id: number;
          passenger_id: number;
          from_address: string;
          to_address: string;
          price: number;
          seats: number;
        }
      | undefined;

    if (!order) {
      return { ok: false, reason: "not_found" };
    }

    if (order.passenger_id === driver.id) {
      return { ok: false, reason: "self" };
    }

    const tripId = createTrip(
      {
        type: "city",
        from: order.from_address,
        to: order.to_address,
        date: "Сегодня",
        time: currentTimeHHMM(),
        price: order.price,
        totalSeats: order.seats,
        transport: "Легковой автомобиль",
      },
      driver
    );

    db.prepare(
      "INSERT OR IGNORE INTO trip_participants (trip_id, user_id) VALUES (?, ?)"
    ).run(tripId, order.passenger_id);

    db.prepare(
      "UPDATE taxi_orders SET status = 'accepted', driver_id = ?, trip_id = ? WHERE id = ?"
    ).run(driver.id, tripId, orderId);

    return { ok: true, tripId };
  });

  return tx();
}

export function cancelOrder(orderId: number, passengerId: number): boolean {
  const result = db
    .prepare(
      "UPDATE taxi_orders SET status = 'cancelled' WHERE id = ? AND passenger_id = ? AND status = 'open'"
    )
    .run(orderId, passengerId);

  return result.changes > 0;
}
