"use client";

import { useEffect, useState } from "react";

const DISMISS_KEY = "edem30_marketplace_announcement_dismissed";

export function isMarketplaceAnnouncementDismissed() {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissMarketplaceAnnouncement() {
  try {
    localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    // ignore
  }
}

export function useMarketplaceAnnouncementVisible(): [boolean, () => void] {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!isMarketplaceAnnouncementDismissed());
  }, []);

  function dismiss() {
    dismissMarketplaceAnnouncement();
    setVisible(false);
  }

  return [visible, dismiss];
}
