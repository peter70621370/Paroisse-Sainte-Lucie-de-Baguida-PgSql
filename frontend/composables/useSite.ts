/** Paramètres publics du site (identité, accueil, contact) avec images provisoires par défaut. */
export type SiteSettings = Record<string, string>;

export const PLACEHOLDERS = {
  logo: '/placeholders/logo.svg',
  emblem: '/placeholders/emblem.svg',
  hero: '/placeholders/hero.webp',
  photo: '/placeholders/photo.svg',
  avatar: '/placeholders/avatar.svg',
  og: '/placeholders/og-default.png',
} as const;

export const useSite = async () => {
  const { data } = await useFetch<{ settings: SiteSettings }>('/api/settings', { key: 'site-settings', dedupe: 'defer' });
  // En anglais, un réglage « xxx.en » renseigné remplace le réglage français « xxx » (sinon le français reste affiché).
  const s = computed<SiteSettings>(() => {
    const all = data.value?.settings ?? {};
    if (loc() !== 'en') return all;
    const out = { ...all };
    for (const [key, value] of Object.entries(all)) if (key.endsWith('.en') && value) out[key.slice(0, -3)] = value;
    return out;
  });
  return {
    s,
    name: computed(() => s.value['site.name'] || 'Paroisse Sainte Lucie de Baguida'),
    tagline: computed(() => s.value['site.tagline'] || ''),
    logo: computed(() => s.value['site.logo'] || PLACEHOLDERS.logo),
    /** Logo téléversé par la paroisse (sinon : emblème provisoire + nom en toutes lettres). */
    customLogo: computed(() => s.value['site.logo'] || ''),
    hours: computed(() => (s.value['site.hours'] || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean)),
    social: computed(() => {
      const all: ['facebook' | 'youtube' | 'whatsapp', string, string | undefined][] = [
        ['facebook', 'Facebook', s.value['social.facebook']],
        ['youtube', 'YouTube', s.value['social.youtube']],
        ['whatsapp', 'WhatsApp', s.value['social.whatsapp']],
      ];
      return all.filter((x): x is ['facebook' | 'youtube' | 'whatsapp', string, string] => !!x[2]);
    }),
    hero: computed(() => s.value['home.heroImage'] || PLACEHOLDERS.hero),
  };
};

/**
 * Valeur d'en-tête (titre, description…). Côté serveur, les en-têtes sont assemblés APRÈS le rendu, hors du contexte de la page :
 * on calcule donc la valeur tout de suite (les données sont déjà chargées). Côté navigateur, elle reste recalculée à chaque changement.
 */
const lazy = <T>(fn: () => T): (() => T) => {
  if (!import.meta.server) return fn;
  const value = fn();
  return () => value;
};

type SeoOpts = { image?: string | null; noindex?: boolean; lang?: string; canonical?: string };

/**
 * Titre de page + description + balises de partage (Open Graph / Twitter) + lien canonique.
 * Les adresses sont rendues absolues avec l'adresse publique du site (NUXT_PUBLIC_SITE_URL).
 */
export const usePageSeo = (title: MaybeRefOrGetter<string>, description?: MaybeRefOrGetter<string | null | undefined>, opts: MaybeRefOrGetter<SeoOpts> = {}) => {
  const siteName = 'Paroisse Sainte Lucie de Baguida';
  const { siteUrl } = useRuntimeConfig().public;
  const route = useRoute();
  const abs = (u: string) => (/^https?:\/\//.test(u) ? u : siteUrl + u);

  // Les titres et descriptions fixes (en français dans le code) sont traduits ; les contenus saisis restent tels quels.
  const full = lazy(() => (toValue(title) ? `${t(toValue(title))} – ${siteName}` : siteName));
  const desc = lazy(() => t(toValue(description)) || undefined);
  const lang = lazy(() => toValue(opts).lang || loc());
  const bare = barePath(route.path);
  const canonical = lazy(() => abs(toValue(opts).canonical ?? route.path));
  const image = lazy(() => abs(toValue(opts).image || PLACEHOLDERS.og));

  useSeoMeta({
    title: full,
    ogTitle: full,
    twitterTitle: full,
    description: desc,
    ogDescription: desc,
    twitterDescription: desc,
    ogType: 'website',
    ogSiteName: siteName,
    ogUrl: canonical,
    ogImage: image,
    twitterImage: image,
    twitterCard: 'summary_large_image',
    ogLocale: lazy(() => ({ ee: 'ee_TG', en: 'en_GB' } as Record<string, string>)[lang()] ?? 'fr_FR'),
    robots: lazy(() => (toValue(opts).noindex ? 'noindex, nofollow' : undefined)),
  });
  useHead({
    link: [
      { rel: 'canonical', href: canonical },
      // Versions linguistiques de la page (pour les moteurs de recherche)
      { rel: 'alternate', hreflang: 'fr', href: abs(lp(bare, 'fr')) },
      { rel: 'alternate', hreflang: 'en', href: abs(lp(bare, 'en')) },
      { rel: 'alternate', hreflang: 'x-default', href: abs(lp(bare, 'fr')) },
    ],
    htmlAttrs: { lang },
  });
};

/** Données structurées schema.org (JSON-LD) pour les moteurs de recherche. */
export const useJsonLd = (data: MaybeRefOrGetter<Record<string, unknown>>) => {
  useHead({
    script: [{ type: 'application/ld+json', innerHTML: lazy(() => JSON.stringify({ '@context': 'https://schema.org', ...toValue(data) }).replace(/</g, '\\u003c')) }],
  });
};

type PageContent = { title: string; excerpt: string | null; content: string; seoTitle: string | null; seoDescription: string | null };

/**
 * Page rédigée dans l'administration, dans la langue du visiteur.
 * Si la version demandée n'existe pas, la version française est renvoyée avec « fallback: true ». `null` si la page n'existe pas.
 */
export const usePageContent = (slug: string, forced?: string) => {
  const locale = forced || loc();
  return useAsyncData(`page-${slug}-${locale}`, async () => {
    const get = (l: string) => $fetch<{ page: PageContent }>(`/api/pages/${slug}`, { query: { locale: l } });
    try {
      return { ...(await get(locale)).page, locale, fallback: false };
    } catch {
      if (locale === 'fr') return null;
      try {
        return { ...(await get('fr')).page, locale: 'fr', fallback: true };
      } catch {
        return null;
      }
    }
  });
};
