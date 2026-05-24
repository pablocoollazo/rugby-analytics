export async function requestPermission() {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

export function notify(title, body) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  new Notification(title, { body, icon: "/pwa-192.png" });
}
