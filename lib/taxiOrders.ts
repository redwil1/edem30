import "server-only";

import { sql } from "@/lib/db";
import { createTrip } from "@/lib/trips";
import { carBodyTypeLabel, isVehicleComplete, Vehicle } from "@/lib/vehicle";
import { sendPushToDrivers, sendPushToUser } from "@/lib/push";

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
  driverVehicle: (Vehicle & { bodyTypeLabel: string }) | null;
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
  driver_car_body_type: string | null;
  driver_car_model: string | null;
  driver_car_plate: string | null;
  driver_car_color: string | null;
};

function toOrder(row: OrderRow): TaxiOrder {
  const driverVehicle: Vehicle = {
    bodyType: row.driver_car_body_type,
    model: row.driver_car_model,
    plate: row.driver_car_plate,
    color: row.driver_car_color,
  };

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
    driverVehicle: isVehicleComplete(driverVehicle)
      ? { ...driverVehicle, bodyTypeLabel: carBodyTypeLabel(driverVehicle.bodyType) }
      : null,
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

  sendPushToDrivers({
    title: "Новый заказ такси",
    body: `${input.from} → ${input.to} · ${input.price} ₽`,
    url: "/taxi",
  });

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
      taxi_orders.created_at as created_at,
      NULL as driver_car_body_type, NULL as driver_car_model,
      NULL as driver_car_plate, NULL as driver_car_color
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
      taxi_orders.created_at as created_at,
      driver.car_body_type as driver_car_body_type,
      driver.car_model as driver_car_model,
      driver.car_plate as driver_car_plate,
      driver.car_color as driver_car_color
    FROM taxi_orders
    JOIN users ON users.id = taxi_orders.passenger_id
    LEFT JOIN users driver ON driver.id = taxi_orders.driver_id
    WHERE taxi_orders.passenger_id = ${passengerId} AND taxi_orders.status IN ('open', 'accepted')
    ORDER BY taxi_orders.created_at DESC
    LIMIT 1
  `;

  return rows[0] ? toOrder(rows[0]) : undefined;
}

function currentDateHHMM(): { date: string; time: string } {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  return { date: `${yyyy}-${mm}-${dd}`, time: `${hh}:${min}` };
}

export type AcceptOrderResult =
  | { ok: true; tripId: number }
  | { ok: false; reason: "not_found" | "self" | "vehicle_incomplete" };

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

  const driverRows = await sql<
    {
      car_body_type: string | null;
      car_model: string | null;
      car_plate: string | null;
      car_color: string | null;
    }[]
  >`
    SELECT car_body_type, car_model, car_plate, car_color FROM users WHERE id = ${driver.id}
  `;

  const vehicle: Vehicle = {
    bodyType: driverRows[0]?.car_body_type ?? null,
    model: driverRows[0]?.car_model ?? null,
    plate: driverRows[0]?.car_plate ?? null,
    color: driverRows[0]?.car_color ?? null,
  };

  if (!isVehicleComplete(vehicle)) {
    return { ok: false, reason: "vehicle_incomplete" };
  }

  const tripId = await sql.begin(async (tx) => {
    const { date, time } = currentDateHHMM();

    const id = await createTrip(
      {
        type: "city",
        from: order.from_address,
        to: order.to_address,
        date,
        time,
        price: order.price,
        totalSeats: order.seats,
        transport: carBodyTypeLabel(vehicle.bodyType),
        transportCategory: vehicle.bodyType ?? undefined,
        carModel: vehicle.model ?? undefined,
        licensePlate: vehicle.plate ?? undefined,
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

  sendPushToUser(order.passenger_id, {
    title: "Водитель найден",
    body: `${carBodyTypeLabel(vehicle.bodyType)} ${vehicle.model} едет к вам`,
    url: `/trip/${tripId}`,
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
