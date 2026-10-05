// Mesure d'audience anonyme : n'envoie quelque chose QUE si le visiteur a accepté, et jamais en administration.
// Rien n'est stocké côté navigateur (pas de cookie, pas d'identifiant) ; le serveur ne garde que des compteurs.
export default defineNuxtPlugin((nuxtApp) => {
  const { consent, load } = useConsent();
  load();
  const router = useRouter();

  let first = true;
  let last = '';

  const send = (path: string) => {
    if (consent.value !== 'granted' || path.startsWith('/admin') || navigator.doNotTrack === '1') return;
    if (path === last) return;
    last = path;
    const body = JSON.stringify({ path, referrer: first ? document.referrer : '' });
    first = false;
    fetch('/api/analytics/hit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => undefined);
  };

  // Première page : une fois l'application affichée. Pages suivantes : à chaque navigation du routeur.
  nuxtApp.hook('app:mounted', () => send(window.location.pathname));
  router.afterEach((to) => {
    if (!nuxtApp.isHydrating) send(to.path);
  });
  // Choix accepté après coup : on compte la page en cours.
  watch(consent, (v) => v === 'granted' && send(window.location.pathname));
});
