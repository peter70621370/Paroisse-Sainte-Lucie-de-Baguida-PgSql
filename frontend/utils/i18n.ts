// Langues du site public. Français = langue par défaut (adresses sans préfixe) ; anglais sous « /en/… ».
// L'éwé est annoncé dans le sélecteur de langue mais pas encore disponible (enabled: false).
//
// Principe des traductions : le texte français sert de clé. « t('Faire un don') » renvoie la traduction anglaise
// (fichier locales/en.ts) quand la page est en anglais, et le texte français tel quel sinon.
// Un texte absent du dictionnaire s'affiche en français : rien ne casse si une traduction manque.
import en from '~/locales/en';

export type Locale = 'fr' | 'en';
export const LOCALES = [
  { code: 'fr', short: 'FR', label: 'Français', enabled: true },
  { code: 'en', short: 'EN', label: 'English', enabled: true },
  { code: 'ee', short: 'EE', label: 'Eʋegbe', enabled: false },
] as const;

const EN_PREFIX = /^\/en(?=\/|$)/;

export const localeOfPath = (path: string): Locale => (EN_PREFIX.test(path) ? 'en' : 'fr');
/** Langue de la page affichée (d'après son adresse). */
export const loc = (): Locale => localeOfPath(useRoute().path);
/** Adresse sans préfixe de langue : « /en/horaires » → « /horaires ». */
export const barePath = (path: string) => path.replace(EN_PREFIX, '') || '/';

/** Adresse d'une page dans la langue courante (ou dans la langue demandée) : lp('/horaires') → « /en/horaires » en anglais. */
export function lp(path: string, locale: Locale = loc()): string {
  if (!path.startsWith('/') || /^\/(admin|api|uploads|placeholders)(\/|$)/.test(path)) return path;
  const bare = barePath(path);
  return locale === 'en' ? (bare === '/' ? '/en' : `/en${bare}`) : bare;
}

/** Traduction : t('Bonjour {nom}', { nom: 'Marie' }). */
export function t(key: string | null | undefined, params?: Record<string, string | number>): string {
  if (!key) return '';
  let s = loc() === 'en' ? ((en as Record<string, string>)[key] ?? key) : key;
  if (params) for (const [k, v] of Object.entries(params)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

/** Format régional des dates. */
export const dateLocale = () => (loc() === 'en' ? 'en-GB' : 'fr-FR');
