"use client";

import { useState } from "react";

import DealCard from "./DealCard";
import TripStartCard from "./TripStartCard";

type Props = {
  tripId: number;
  instantTaxi: boolean;
  initialPrice: number;
  tripDate: string;
  tripTime: string;
};

export default function TripFlowCards({
  tripId,
  instantTaxi,
  initialPrice,
  tripDate,
  tripTime,
}: Props) {
  const [dealFinalized, setDealFinalized] = useState(!instantTaxi);

  if (instantTaxi && !dealFinalized) {
    return (
      <DealCard
        tripId={tripId}
        initialPrice={initialPrice}
        onFinalized={() => setDealFinalized(true)}
      />
    );
  }

  return <TripStartCard tripId={tripId} tripDate={tripDate} tripTime={tripTime} />;
}
