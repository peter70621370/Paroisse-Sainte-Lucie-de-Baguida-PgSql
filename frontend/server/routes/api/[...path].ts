// Relais vers le backend, configurable À L'EXÉCUTION (NUXT_API_INTERNAL).
// Sert surtout au rendu serveur (SSR) : en production, c'est Nginx qui envoie /api directement au backend pour les navigateurs.
export default defineEventHandler((event) => {
  const { apiInternal } = useRuntimeConfig();
  return proxyRequest(event, `${apiInternal}${event.path}`);
});
