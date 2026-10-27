// Paper Desk service worker: app shell cached for offline use; data.json is network-first.
const CACHE = "paper-desk-v18";
const SHELL = ["./", "./index.html", "./manifest.json", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/apple-touch-icon.png",
  "./fonts/Inter-400.ttf", "./fonts/Inter-500.ttf", "./fonts/Inter-600.ttf", "./fonts/Inter-700.ttf", "./fonts/Inter-800.ttf"];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  // v15: take over, drop old caches, and if this replaced an older version, reload the open windows once so a phone app that was
  // left running on old code (v12/v13/v14) switches to the new code without the user doing anything.
  e.waitUntil(caches.keys().then((ks) => {
    const upgraded = ks.some((k) => k.startsWith("paper-desk-") && k !== CACHE);
    return Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))).then(() => self.clients.claim()).then(() => upgraded
      ? self.clients.matchAll({ type: "window" }).then((cs) => { cs.forEach((c) => { const u = new URL(c.url); u.search = ""; u.hash = ""; c.navigate(u.href).catch(() => {}); }); })   // NOT awaited: the navigation needs this SW's fetch handler, which waits for activate to finish
      : null);
  }));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.endsWith("/data.json")) {            // fresh data first, cached copy offline
    e.respondWith(fetch(req, { cache: "no-store" }).then((r) => { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(url.pathname, cp)); return r; })
      .catch(() => caches.match(url.pathname)));
    return;
  }
  if (req.mode === "navigate" || url.pathname.endsWith("/index.html") || url.pathname.endsWith("/")) {   // app shell: network first so updates arrive, cache offline
    e.respondWith(fetch(req, { cache: "no-store" }).then((r) => { const cp = r.clone(); caches.open(CACHE).then((c) => c.put("./index.html", cp)); return r; })
      .catch(() => caches.match("./index.html")));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((r) => {
    const cp = r.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); return r; })));
});
