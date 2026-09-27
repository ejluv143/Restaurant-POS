"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Icon } from "@/components/ui";

/** Polls a staff JSON endpoint while the tab is visible. Starts from server-rendered data. */
export function usePoll<T>(url: string, initial: T, intervalMs = 4000) {
  const [data, setData] = useState(initial);
  const [online, setOnline] = useState(true);
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const res = await fetch(url, { cache: "no-store" });
      // Signed out elsewhere (or session expired): reload so the proxy sends us to /login
      if (res.status === 401) return window.location.reload();
      if (!res.ok) throw new Error(String(res.status));
      setData(await res.json());
      setOnline(true);
    } catch {
      setOnline(false);
    } finally {
      inFlight.current = false;
    }
  }, [url]);

  useEffect(() => {
    const id = setInterval(() => !document.hidden && refresh(), intervalMs);
    const onVisible = () => !document.hidden && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh, intervalMs]);

  return { data, online, refresh };
}

const subscribeClock = (cb: () => void) => {
  const id = setInterval(cb, 1000);
  return () => clearInterval(id);
};

/** Ticking clock (whole seconds). Null during server render/hydration so times only render in the browser. */
export function useNow() {
  return useSyncExternalStore(
    subscribeClock,
    () => Math.floor(Date.now() / 1000) * 1000,
    () => null,
  );
}

export const minutesSince = (iso: string, now: number) => Math.max(0, Math.floor((now - Date.parse(iso)) / 60_000));

export function useToast() {
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);
  const show = useCallback((text: string, error = false) => setToast({ text, error }), []);
  const node = (
    <div aria-live="polite" className="fixed z-[70] bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md pointer-events-none print:hidden">
      {toast && (
        <div
          className={`px-4 py-3 rounded-lg shadow-2xl border font-label-lg text-label-lg flex items-center gap-2 ${
            toast.error ? "bg-error-container text-on-error-container border-error/30" : "bg-surface-container-highest text-on-surface border-outline-variant/40"
          }`}
        >
          <Icon name={toast.error ? "error" : "check_circle"} className={`text-[20px] ${toast.error ? "" : "text-tertiary"}`} />
          {toast.text}
        </div>
      )}
    </div>
  );
  return { show, node };
}

/** Short two-tone chime for new tickets / calls (Web Audio; no asset to load). */
export function chime() {
  try {
    const ctx = new AudioContext();
    [880, 1175].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + i * 0.18 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.18 + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.18);
      osc.stop(ctx.currentTime + i * 0.18 + 0.32);
    });
    setTimeout(() => ctx.close(), 1000);
  } catch {
    // Audio blocked until the user interacts with the page; the visual alert still shows
  }
}

/** Browser notification when the tab is in the background (only if the user granted permission). */
export function notifyBrowser(title: string, body: string) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted" || !document.hidden) return;
  try {
    new Notification(title, { body, tag: title });
  } catch {
    // Some mobile browsers only allow notifications from a service worker
  }
}
