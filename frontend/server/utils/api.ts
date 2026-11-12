import type { H3Event } from 'h3';

// Adresse interne du backend. Accepte « http://hôte:port » (Docker) comme « hôte:port » seul.
export function apiBase(): string {
  const { apiInternal } = useRuntimeConfig();
  const url = /^https?:\/\//.test(apiInternal) ? apiInternal : `http://${apiInternal}`;
  return url.replace(/\/+$/, '');
}

/**
 * En-têtes ajoutés aux appels relayés vers l'API quand elle est sur Internet (Vercel) : l'API ne voit alors que
 * l'adresse du site, donc le site lui transmet celle du visiteur, avec le secret partagé qui prouve que l'appel vient de lui.
 * Sans secret (Docker, derrière Nginx), rien n'est ajouté.
 */
export function relayHeaders(event: H3Event): Record<string, string> {
  const { relaySecret } = useRuntimeConfig();
  if (!relaySecret) return {};
  // Vide pour un appel interne du rendu serveur (aucune adresse de visiteur) : l'API l'exempte de ses limites.
  return { 'x-relay-secret': relaySecret, 'x-client-ip': getRequestIP(event, { xForwardedFor: true }) ?? '' };
}
