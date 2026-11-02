/**
 * Production service worker only.
 * Not registered in dev — a cached Vite shell breaks the live preview.
 */
import { useEffect } from "react";

export function PwaRuntime() {
  useEffect(() => {
    if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => undefined);
  }, []);
  return null;
}
