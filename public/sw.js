/* Pass-through service worker.
 * Browsers can offer installation because a fetch handler is registered.
 * Requests are not intercepted, and nothing is stored: tasks, API responses,
 * and other user data are never cached. There is no offline reading or writing.
 */

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Leave every request to the browser.
});
