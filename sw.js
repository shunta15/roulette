const CACHE_NAME = "roulette-pwa-v1";

// キャッシュしたい最低限のファイル
const ASSETS = [
  "/roulette/",
  "/roulette/index.html",
  "/roulette/manifest.webmanifest",
  "/roulette/offline.html",
  "/roulette/icon-192.png",
  "/roulette/icon-512.png",
  "/roulette/sw.js"
];

// インストール時にキャッシュ
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// 古いキャッシュ削除
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null)))
    )
  );
  self.clients.claim();
});

// ネット優先 → ダメならキャッシュ（HTMLはオフラインページにフォールバック）
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 自分のPages配下だけ処理
  if (!url.pathname.startsWith("/roulette/")) return;

  // HTMLは特別扱い
  const isHTML =
    req.mode === "navigate" ||
    (req.headers.get("accept") || "").includes("text/html");

  if (isHTML) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          return (
            (await cache.match(req)) ||
            (await cache.match("/roulette/offline.html"))
          );
        })
    );
    return;
  }

  // それ以外（画像など）
  event.respondWith(
    caches.match(req).then((cached) => {
      return (
        cached ||
        fetch(req)
          .then((res) => {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
            return res;
          })
          .catch(() => cached)
      );
    })
  );
});
