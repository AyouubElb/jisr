"use client";

import { useEffect } from "react";

export function SplashRemover(): null {
  useEffect(() => {
    const el = document.getElementById("app-splash");
    if (!el) return;
    el.classList.add("is-hidden");
  }, []);

  return null;
}
