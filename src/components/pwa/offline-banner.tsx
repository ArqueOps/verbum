"use client";

import { useSyncExternalStore } from "react";
import { WifiOff } from "lucide-react";

function subscribe(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getSnapshot() {
  return navigator.onLine;
}

function getServerSnapshot() {
  return true;
}

export function OfflineBanner() {
  const isOnline = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (isOnline) return null;

  return (
    <div
      role="alert"
      className="fixed top-0 left-0 z-50 flex w-full items-center justify-center gap-2 bg-amber-600 px-4 py-2 text-sm font-medium text-white shadow-md dark:bg-amber-700"
    >
      <WifiOff className="size-4 shrink-0" />
      <span>Modo offline — exibindo conteúdo salvo</span>
    </div>
  );
}
