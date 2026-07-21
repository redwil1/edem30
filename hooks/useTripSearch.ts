"use client";

import { useMemo } from "react";
import { Trip } from "@/types/trips";

export function useTripSearch(trips: Trip[], from: string, to: string) {
  return useMemo(() => {
    return trips.filter((trip) => {
      const fromOk =
        from === "" || trip.from.toLowerCase().includes(from.toLowerCase());

      const toOk =
        to === "" || trip.to.toLowerCase().includes(to.toLowerCase());

      return fromOk && toOk;
    });
  }, [trips, from, to]);
}
