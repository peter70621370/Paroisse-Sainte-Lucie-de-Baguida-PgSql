// Fichiers de la médiathèque (même principe que le relais /api).
export default defineEventHandler((event) => {
  return proxyRequest(event, `${apiBase()}${event.path}`);
});
