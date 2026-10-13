// Adresse interne du backend. Accepte « http://hôte:port » (Docker) comme « hôte:port » seul (réseau privé de Render).
export function apiBase(): string {
  const { apiInternal } = useRuntimeConfig();
  const url = /^https?:\/\//.test(apiInternal) ? apiInternal : `http://${apiInternal}`;
  return url.replace(/\/+$/, '');
}
