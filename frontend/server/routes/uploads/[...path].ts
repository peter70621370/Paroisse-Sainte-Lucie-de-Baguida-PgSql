// Fichiers de la médiathèque (même principe que le relais /api). Avec Vercel Blob, l'API répond par une redirection
// vers le fichier : elle est transmise telle quelle au navigateur (pas de téléchargement par le site).
export default defineEventHandler((event) => {
  return proxyRequest(event, `${apiBase()}${event.path}`, { headers: relayHeaders(event), fetchOptions: { redirect: 'manual' } });
});
