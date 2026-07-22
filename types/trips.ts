export type TripType = "city" | "intercity";

export interface Trip {
  id: number;

  type: TripType;

  from: string;

  to: string;

  date: string;

  time: string;

  price: number;

  seats: number;

  driver: string;

  driverId: number | null;

  rating: number;

  verified: boolean;

  tripsCount: number;

  transport: string;

  transportCategory: string | null;

  totalSeats: number;

  carModel: string | null;

  licensePlate: string | null;

  driverAvatarUrl: string | null;

  driverAvatarPreset: string | null;
}
