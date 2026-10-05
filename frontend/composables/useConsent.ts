/**
 * Choix du visiteur pour la mesure d'audience. Stocké dans le navigateur (localStorage, ce n'est pas un cookie).
 * 'unset' = pas encore choisi -> le bandeau s'affiche ; 'granted' / 'denied' = choix mémorisé.
 */
export type Consent = 'unset' | 'granted' | 'denied';
const KEY = 'consent-analytics';

export const useConsent = () => {
  const consent = useState<Consent>('consent', () => 'unset');

  function load() {
    try {
      const v = localStorage.getItem(KEY);
      consent.value = v === 'granted' || v === 'denied' ? v : 'unset';
    } catch {
      consent.value = 'unset';
    }
  }
  function set(v: Consent) {
    consent.value = v;
    try {
      if (v === 'unset') localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, v);
    } catch { /* navigateur en mode privé : le choix vaut pour la session */ }
  }
  return { consent, load, set };
};
