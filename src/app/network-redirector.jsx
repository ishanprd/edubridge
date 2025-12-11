"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

const OFFLINE_ROUTE = "/offline-content";
const OFFLINE_HTML_ROUTE = "/offline-content.html";
const LAST_ONLINE_PATH_KEY = "edubridge:last-online-path";

export default function NetworkRedirector() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const rememberPath = () => {
      try {
        const current =
          window.location.pathname +
          window.location.search +
          window.location.hash;
        if (
          current === OFFLINE_ROUTE ||
          current === OFFLINE_HTML_ROUTE
        ) {
          return;
        }
        localStorage.setItem(LAST_ONLINE_PATH_KEY, current);
      } catch {
        // localStorage might be unavailable; ignore
      }
    };

    const redirectToOffline = () => {
      if (navigator.onLine === false) {
        const currentPath = window.location.pathname;
        if (
          currentPath !== OFFLINE_ROUTE &&
          currentPath !== OFFLINE_HTML_ROUTE
        ) {
          rememberPath();
          router.replace(OFFLINE_HTML_ROUTE);
        }
      }
    };

    const redirectBackOnline = () => {
      if (!navigator.onLine) return;
      const currentPath = window.location.pathname;
      if (
        currentPath === OFFLINE_ROUTE ||
        currentPath === OFFLINE_HTML_ROUTE
      ) {
        const target =
          localStorage.getItem(LAST_ONLINE_PATH_KEY) || "/";
        router.replace(target);
      }
    };

    // initial check on mount
    if (navigator.onLine) {
      redirectBackOnline();
    } else {
      redirectToOffline();
    }

    window.addEventListener("offline", redirectToOffline);
    window.addEventListener("online", redirectBackOnline);

    return () => {
      window.removeEventListener("offline", redirectToOffline);
      window.removeEventListener("online", redirectBackOnline);
    };
  }, [router]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!navigator.onLine) return;
    try {
      const current =
        window.location.pathname +
        window.location.search +
        window.location.hash;
      if (
        current !== OFFLINE_ROUTE &&
        current !== OFFLINE_HTML_ROUTE
      ) {
        localStorage.setItem(LAST_ONLINE_PATH_KEY, current);
      }
    } catch {
      // ignore write failures
    }
  }, [pathname]);

  return null;
}
