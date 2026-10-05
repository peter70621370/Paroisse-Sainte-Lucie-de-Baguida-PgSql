/** Paramètres publics du site (identité, accueil, contact) avec images provisoires par défaut. */
export type SiteSettings = Record<string, string>;

export const PLACEHOLDERS = {
  logo: '/placeholders/logo.svg',
  hero: '/placeholders/hero.svg',
  photo: '/placeholders/photo.svg',
  avatar: '/placeholders/avatar.svg',
} as const;

export const useSite = async () => {
  const { data } = await useFetch<{ settings: SiteSettings }>('/api/settings', { key: 'site-settings', dedupe: 'defer' });
  const s = computed(() => data.value?.settings ?? {});
  return {
    s,
    name: computed(() => s.value['site.name'] || 'Paroisse Sainte Lucie de Baguida'),
    tagline: computed(() => s.value['site.tagline'] || ''),
    logo: computed(() => s.value['site.logo'] || PLACEHOLDERS.logo),
    hero: computed(() => s.value['home.heroImage'] || PLACEHOLDERS.hero),
  };
};

/** Titre de page + balises de partage, dans le style « Titre – Nom du site ». */
export const usePageSeo = (title: MaybeRefOrGetter<string>, description?: MaybeRefOrGetter<string | null | undefined>) => {
  const siteName = 'Paroisse Sainte Lucie de Baguida';
  const full = computed(() => (toValue(title) ? `${toValue(title)} – ${siteName}` : siteName));
  useSeoMeta({
    title: full,
    ogTitle: full,
    description: () => toValue(description) || undefined,
    ogDescription: () => toValue(description) || undefined,
    ogType: 'website',
  });
};
