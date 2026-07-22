"use client";

import { useEffect } from "react";

const SESSION_FLAG = "edem30_visit_logged";

export default function VisitTracker() {
  useEffect(() => {
    if (sessionStorage.getItem(SESSION_FLAG)) return;

    sessionStorage.setItem(SESSION_FLAG, "1");

    fetch("/api/track-visit", { method: "POST" }).catch(() => {});
  }, []);

  return null;
}
