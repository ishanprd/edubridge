
"use client";

import { useEffect } from "react";

const OFFLINE_PAGE = "/offline-content";

export default function SWWarmup() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (!navigator.onLine) return;

    (async () => {
      try {
        const reg = await navigator.serviceWorker.ready.catch(() => null);
        const ctl = navigator.serviceWorker.controller;
        if (!reg || !ctl) return;

        const urls = new Set();
        urls.add(OFFLINE_PAGE);

        const m = window.__BUILD_MANIFEST;
        if (m && m[OFFLINE_PAGE] && Array.isArray(m[OFFLINE_PAGE])) {
          m[OFFLINE_PAGE].forEach((u) => {
            if (u && typeof u === "string") urls.add(u);
          });
        }

        document
          .querySelectorAll(
            'link[rel="modulepreload"][as="script"][href^="/_next/"],script[src^="/_next/"]'
          )
          .forEach((el) => {
            const h = el.href || el.src;
            if (h) urls.add(new URL(h, location.origin).pathname);
          });

        document
          .querySelectorAll('script[src*="offline-content"][src^="/_next/"]')
          .forEach((el) => {
            const h = el.src;
            if (h) urls.add(new URL(h, location.origin).pathname);
          });

        ctl.postMessage({
          type: "CACHE_URLS",
          urls: Array.from(urls),
        });
      } catch {}
    })();
  }, []);

  return null;
}
