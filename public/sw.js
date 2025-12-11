const VERSION = "v9"; 
let USER_NS = "anon";
const PROFILE_URL = "/__profile.json";
const OFFLINE_URL = "/offline.html";
const OFFLINE_CONTENT_ROUTE = "/offline-content";
const pdfCache = () => `pdfs-${VERSION}`;


const PRECACHE_ROUTES = ["/","/offline-content.html", OFFLINE_CONTENT_ROUTE];
const SHELL_CACHE = () => `shell-${VERSION}`;

const pageCache = () => `pages-${VERSION}-${USER_NS}`;
const assetCache = () => `assets-${VERSION}`;
const apiCache  = () => `api-${VERSION}-${USER_NS}`;

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const shell = await caches.open(SHELL_CACHE());
    await shell.addAll([OFFLINE_URL, ...PRECACHE_ROUTES]);
    await caches.open(pageCache());
  })());
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter(k => !k.includes(VERSION)).map(k => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

self.addEventListener("message", (e) => {
    
  const { type, userIdHash, urls, profile, pdfs } = e.data || {};
  
  if (type === "SET_PROFILE" && profile) {
    e.waitUntil((async () => {
      const c = await caches.open(pageCache());
      const resp = new Response(JSON.stringify(profile), {
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
      });
      await c.put(PROFILE_URL, resp); 
    })());
  }
  if (type === "SET_USER" && userIdHash) USER_NS = userIdHash;

  if (type === "CACHE_URLS" && Array.isArray(urls) && urls.length) {
    e.waitUntil((async () => {
      const c = await caches.open(pageCache());
      await Promise.all(urls.map(u => c.add(u).catch(() => {})));
    })());
  }

  if (type === "CACHE_PDFS" && Array.isArray(pdfs) && pdfs.length) {
    e.waitUntil((async () => {
      const cache = await caches.open(pdfCache());
      const urlList = Array.from(new Set(pdfs
        .filter(u => typeof u === "string" && u.trim().length)
        .map(u => new URL(u, self.location.origin).href)));

      await Promise.all(urlList.map(async (u) => {
        const req = new Request(u);
        const already = await cache.match(req);
        if (already) return;
        try {
          const resp = await fetch(req);
          if (resp && resp.ok) await cache.put(req, resp.clone());
        } catch {}
      }));
    })());
  }

  if (type === "LOGOUT") {
    e.waitUntil((async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter(k => k.includes(`-${USER_NS}`)).map(k => caches.delete(k)));
      USER_NS = "anon";
    })());
  }
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (url.origin === self.location.origin && url.pathname === PROFILE_URL) {
    e.respondWith((async () => {
      const c = await caches.open(pageCache());
      return (await c.match(PROFILE_URL)) || new Response("{}", { headers: { "Content-Type": "application/json" }});
    })());
    return;
  }

  if (url.origin === self.location.origin && (url.pathname === "/offline-content.html" || url.pathname === OFFLINE_CONTENT_ROUTE)) {
    e.respondWith((async () => {
      return (await caches.match("/offline-content.html"))
          || (await caches.match(OFFLINE_URL));
    })());
    return;
  }

  
  if (url.origin !== self.location.origin) return;
  if (url.origin === self.location.origin && url.pathname.startsWith("/files/") && req.method === "GET") {
    e.respondWith(cacheFirstPdf(req));
    return;
  }
  if (url.pathname.startsWith("/api/auth/")) return;

  if (url.pathname.startsWith("/api/")) {
    e.respondWith(networkFirst(req, apiCache()));
    return;
  }

  if (req.mode === "navigate" || (req.method === "GET" && req.headers.get("accept")?.includes("text/html"))) {
    e.respondWith(networkFirstNav(req));
    return;
  }

  if (url.pathname.startsWith("/_next/")) {
    e.respondWith(staleWhileRevalidate(req, assetCache()));
    return;
  }

  e.respondWith(fetch(req).catch(() => caches.match(req)));
});


async function networkFirstNav(req) {
  const cache = await caches.open(pageCache());
  try {
    const fresh = await fetch(req);
    if (fresh.ok) cache.put(req, fresh.clone()).catch(() => {});
    return fresh;
  } catch {
    const exact = await cache.match(req);
    if (exact) return exact;
    // Prefer richer offline content page when offline
    const offlineContent = await caches.match("/offline-content.html");
    if (offlineContent) return offlineContent;
    return (await caches.match(OFFLINE_URL));
  }
}


async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);
  
  try {
    const fresh = await fetch(req, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (fresh.ok) cache.put(req, fresh.clone()).catch(() => {});
    return fresh;
  } catch {
    clearTimeout(timeoutId);
    return (await cache.match(req)) || Response.error();
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  const freshP = fetch(req).then(res => { if (res && res.ok) cache.put(req, res.clone()).catch(() => {}); return res; }).catch(() => null);
  return cached || (await freshP) || Response.error();
}

async function cacheFirstPdf(req) {
  const cache = await caches.open(pdfCache());
  const urlOnlyReq = new Request(req.url);
  const range = req.headers.get("range");

  if (range) {
    let cached = await cache.match(urlOnlyReq);
    if (!cached) {
      const networkRes = await fetch(req.url);
      if (!networkRes || !networkRes.ok) return networkRes;
      await cache.put(urlOnlyReq, networkRes.clone());
      cached = networkRes;
    }
    const buf = await cached.arrayBuffer();
    const size = buf.byteLength;
    const { start, end } = parseRange(range, size);
    const chunk = buf.slice(start, end + 1);
    return new Response(chunk, {
      status: 206,
      headers: {
        "Content-Range": `bytes ${start}-${end}/${size}`,
        "Accept-Ranges": "bytes",
        "Content-Length": String(chunk.byteLength),
        "Content-Type": cached.headers.get("Content-Type") || "application/pdf",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }

  const cached = await cache.match(urlOnlyReq);
  if (cached) return cached;

  const fresh = await fetch(req).catch(() => null);
  if (fresh && fresh.ok && fresh.status === 200) {
    await cache.put(urlOnlyReq, fresh.clone());
  }
  return fresh || Response.error();
}

function parseRange(rangeHeader, size) {
  const m = /bytes=(\d*)-(\d*)/.exec(rangeHeader || "");
  let start = 0, end = size - 1;
  if (m) {
    if (m[1] !== "") start = parseInt(m[1], 10);
    if (m[2] !== "") end = parseInt(m[2], 10);
    if (m[1] === "" && m[2] !== "") {
      const len = parseInt(m[2], 10);
      start = Math.max(0, size - len);
      end = size - 1;
    }
  }
  start = Math.max(0, Math.min(start, size - 1));
  end = Math.max(start, Math.min(end, size - 1));
  return { start, end };
}
