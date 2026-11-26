"use client";

import { useReportWebVitals } from "next/web-vitals";

export function WebVitalsReporter() {
  useReportWebVitals((metric) => {
    if (process.env.NODE_ENV !== "production") return;
    const payload = JSON.stringify({
      id: metric.id,
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      route: window.location.pathname,
      device: window.matchMedia("(max-width: 767px)").matches ? "mobile" : "desktop",
    });
    navigator.sendBeacon?.("/api/vitals", new Blob([payload], { type: "application/json" }));
  });
  return null;
}
