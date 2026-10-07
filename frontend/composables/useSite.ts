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
  const s = computed(() => data.value?.settings ?? {});
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

  const full = computed(() => (toValue(title) ? `${toValue(title)} – ${siteName}` : siteName));
  const canonical = computed(() => abs(toValue(opts).canonical ?? route.path));
  const image = computed(() => abs(toValue(opts).image || PLACEHOLDERS.og));

  useSeoMeta({
    title: full,
    ogTitle: full,
    twitterTitle: full,
    description: () => toValue(description) || undefined,
    ogDescription: () => toValue(description) || undefined,
    twitterDescription: () => toValue(description) || undefined,
    ogType: 'website',
    ogSiteName: siteName,
    ogUrl: canonical,
    ogImage: image,
    twitterImage: image,
    twitterCard: 'summary_large_image',
    ogLocale: () => (toValue(opts).lang === 'ee' ? 'ee_TG' : 'fr_FR'),
    robots: () => (toValue(opts).noindex ? 'noindex, nofollow' : undefined),
  });
  useHead({
    link: [{ rel: 'canonical', href: canonical }],
    htmlAttrs: { lang: () => toValue(opts).lang || 'fr' },
  });
};

/** Données structurées schema.org (JSON-LD) pour les moteurs de recherche. */
export const useJsonLd = (data: MaybeRefOrGetter<Record<string, unknown>>) => {
  useHead({
    script: [{ type: 'application/ld+json', innerHTML: () => JSON.stringify({ '@context': 'https://schema.org', ...toValue(data) }).replace(/</g, '\\u003c') }],
  });
};
