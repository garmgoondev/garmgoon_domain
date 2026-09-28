// 가족 공간 알림용 서비스 워커. 화면 캐시는 하지 않고(로그인 정보가 섞이지 않게) 푸시 알림만 처리한다.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data?.text() };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "우리 가족", {
      body: data.body || "",
      icon: "/icons/family-192.png",
      badge: "/icons/family-192.png",
      tag: data.tag,
      renotify: Boolean(data.tag),
      data: { url: data.url || "/family" },
    }),
  );
});

// 알림을 누르면 열려 있는 가족 탭으로 가고, 없으면 새로 연다
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/family", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const open = windows.find((w) => new URL(w.url).pathname.startsWith("/family"));
      if (open) return open.focus().then((w) => w.navigate?.(url) || w);
      return self.clients.openWindow(url);
    }),
  );
});
