// Relais vers le backend, configurable À L'EXÉCUTION (NUXT_API_INTERNAL).
// Sert surtout au rendu serveur (SSR) : derrière Nginx, /api va directement au backend ; sur Render (sans Nginx), tout passe par ce relais.
export default defineEventHandler((event) => {
  return proxyRequest(event, `${apiBase()}${event.path}`);
});
