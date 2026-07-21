import "server-only";

import { sql } from "@/lib/db";
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

export async function createOrder(
  input: CreateOrderInput,
  passenger: { id: number }
): Promise<number> {
  const rows = await sql<{ id: number }[]>`
    INSERT INTO taxi_orders (passenger_id, from_address, to_address, price, seats)
    VALUES (${passenger.id}, ${input.from}, ${input.to}, ${input.price}, ${input.seats})
    RETURNING id
  `;

  return rows[0].id;
}

export async function listOpenOrders(excludeUserId: number): Promise<TaxiOrder[]> {
  const rows = await sql<OrderRow[]>`
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
    WHERE taxi_orders.status = 'open' AND taxi_orders.passenger_id != ${excludeUserId}
    ORDER BY taxi_orders.created_at DESC
  `;

  return rows.map(toOrder);
}

export async function getLatestOrderForPassenger(
  passengerId: number
): Promise<TaxiOrder | undefined> {
  const rows = await sql<OrderRow[]>`
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
    WHERE taxi_orders.passenger_id = ${passengerId} AND taxi_orders.status IN ('open', 'accepted')
    ORDER BY taxi_orders.created_at DESC
    LIMIT 1
  `;

  return rows[0] ? toOrder(rows[0]) : undefined;
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

export async function acceptOrder(
  orderId: number,
  driver: { id: number; name: string }
): Promise<AcceptOrderResult> {
  const orderRows = await sql<
    {
      id: number;
      passenger_id: number;
      from_address: string;
      to_address: string;
      price: number;
      seats: number;
    }[]
  >`
    SELECT id, passenger_id, from_address, to_address, price, seats
    FROM taxi_orders WHERE id = ${orderId} AND status = 'open'
  `;

  const order = orderRows[0];

  if (!order) {
    return { ok: false, reason: "not_found" };
  }

  if (order.passenger_id === driver.id) {
    return { ok: false, reason: "self" };
  }

  const tripId = await sql.begin(async (tx) => {
    const id = await createTrip(
      {
        type: "city",
        from: order.from_address,
        to: order.to_address,
        date: "Сегодня",
        time: currentTimeHHMM(),
        price: order.price,
        totalSeats: order.seats,
        transport: "Легковой автомобиль",
        transportCategory: "sedan",
      },
      driver,
      tx
    );

    await tx`
      INSERT INTO trip_participants (trip_id, user_id) VALUES (${id}, ${order.passenger_id})
      ON CONFLICT (trip_id, user_id) DO NOTHING
    `;

    await tx`
      UPDATE taxi_orders SET status = 'accepted', driver_id = ${driver.id}, trip_id = ${id}
      WHERE id = ${orderId}
    `;

    return id;
  });

  return { ok: true, tripId };
}

export async function cancelOrder(
  orderId: number,
  passengerId: number
): Promise<boolean> {
  const result = await sql`
    UPDATE taxi_orders SET status = 'cancelled'
    WHERE id = ${orderId} AND passenger_id = ${passengerId} AND status = 'open'
  `;

  return result.count > 0;
}
