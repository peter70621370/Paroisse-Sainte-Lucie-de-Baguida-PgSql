<script setup lang="ts">
const route = useRoute();
const slug = String(route.params.slug);

// Langue : français par défaut ; « ?lang=ee » affiche la version éwé si elle existe.
const lang = computed(() => (route.query.lang === 'ee' ? 'ee' : 'fr'));

type PageData = { page: { title: string; excerpt: string | null; content: string; seoTitle: string | null; seoDescription: string | null } };
const [{ data: locs }, { data, error }] = await Promise.all([
  useFetch<{ locales: string[] }>(`/api/pages/${slug}/locales`, { key: `locales-${slug}` }),
  useFetch<PageData>(`/api/pages/${slug}`, { query: computed(() => ({ locale: lang.value })), watch: [lang] }),
]);
if (error.value || !data.value) {
  if (lang.value !== 'fr') await navigateTo(route.path); // pas de traduction : retour au français
  else throw createError({ statusCode: 404, statusMessage: 'Page introuvable', fatal: true });
}

const page = computed(() => data.value!.page);
const languages = [['fr', 'Français'], ['ee', 'Éwé']] as const;
const available = computed(() => languages.filter(([code]) => locs.value?.locales.includes(code)));

usePageSeo(() => page.value.seoTitle || page.value.title, () => page.value.seoDescription || page.value.excerpt, () => ({
  lang: lang.value,
  canonical: lang.value === 'fr' ? route.path : `${route.path}?lang=${lang.value}`,
}));
</script>

<template>
  <div>
    <PageTitle :title="page.title" :subtitle="page.excerpt" />
    <div v-if="available.length > 1" class="mx-auto max-w-3xl px-4 pt-6 text-right text-sm" role="group" aria-label="Langue de la page">
      <template v-for="([code, label], i) in available" :key="code">
        <span v-if="i" class="mx-2 text-slate-400" aria-hidden="true">|</span>
        <NuxtLink :to="code === 'fr' ? { query: {} } : { query: { lang: code } }" :hreflang="code" :lang="code" :class="lang === code ? 'font-bold text-navy' : 'text-navy underline'">{{ label }}</NuxtLink>
      </template>
    </div>
    <!-- Contenu nettoyé côté serveur à l'enregistrement (balises de mise en forme uniquement). -->
    <article class="rich mx-auto max-w-3xl px-4 py-10" :lang="lang" v-html="page.content" />
  </div>
</template>
