self.addEventListener("push", (event) => {
  event.waitUntil(
    self.registration.showNotification("Lecão Aluguel de Tendas", {
      body: "Há tenda confirmada aguardando montagem. Abra o painel para ver.",
      icon: "/favicon.ico",
      tag: "lembrete-montagem",
      renotify: true,
      requireInteraction: true,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow("/admin"));
});
