/** Extrait un message lisible d'une erreur renvoyée par l'API ({ error, details }). */
export function apiError(e: any, fallback = 'Une erreur est survenue.'): string {
  if (e?.statusCode === 429 || e?.status === 429) return 'Trop de requêtes. Réessayez dans un instant.';
  const data = e?.data;
  const details = data?.details && Object.values(data.details).flat().filter(Boolean);
  if (details?.length) return `${data.error} : ${details.join(', ')}`;
  return data?.error || fallback;
}
