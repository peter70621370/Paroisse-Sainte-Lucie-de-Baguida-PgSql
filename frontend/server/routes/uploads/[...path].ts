// Fichiers de la médiathèque (même principe que le relais /api).
export default defineEventHandler((event) => {
  const { apiInternal } = useRuntimeConfig();
  return proxyRequest(event, `${apiInternal}${event.path}`);
});
