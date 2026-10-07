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

// Rubrique du menu à laquelle appartient la page (pour proposer les pages voisines).
const section = computed(() => NAV.find((n) => n.children?.some((c) => c.to === route.path)));

usePageSeo(() => page.value.seoTitle || page.value.title, () => page.value.seoDescription || page.value.excerpt, () => ({
  lang: lang.value,
  canonical: lang.value === 'fr' ? route.path : `${route.path}?lang=${lang.value}`,
}));
</script>

<template>
  <div>
    <PageTitle :title="page.title" :subtitle="page.excerpt" />
    <div :class="['mx-auto grid gap-10 px-4 py-12', section ? 'max-w-6xl lg:grid-cols-[minmax(0,1fr)_19rem]' : 'max-w-3xl']">
      <div class="min-w-0">
        <div v-if="available.length > 1" class="mb-6 flex justify-end gap-2 text-sm" role="group" aria-label="Langue de la page">
          <NuxtLink v-for="[code, label] in available" :key="code" :to="code === 'fr' ? { query: {} } : { query: { lang: code } }" :hreflang="code" :lang="code" :class="['rounded-full border px-3.5 py-1 font-semibold', lang === code ? 'border-navy bg-navy text-white' : 'border-navy/40 text-navy hover:border-navy']">{{ label }}</NuxtLink>
        </div>
        <!-- Contenu nettoyé côté serveur à l'enregistrement (balises de mise en forme uniquement). -->
        <article class="rich text-lg" :lang="lang" v-html="page.content" />
      </div>

      <aside v-if="section" class="space-y-5">
        <nav class="card overflow-hidden" :aria-label="section.label">
          <h2 class="bg-navy px-5 py-3 font-serif text-lg font-bold text-white">{{ section.label }}</h2>
          <ul class="divide-y divide-slate-100">
            <li v-for="c in section.children" :key="c.to">
              <NuxtLink :to="c.to" :class="['flex items-center justify-between gap-2 px-5 py-3 text-[0.95rem] transition hover:bg-cream', c.to === route.path ? 'border-l-4 border-gold bg-cream font-semibold text-navy' : 'text-slate-700']" :aria-current="c.to === route.path ? 'page' : undefined">
                {{ c.label }}<Icon name="chevron-right" class="text-gold-dark" />
              </NuxtLink>
            </li>
          </ul>
        </nav>
        <div class="bg-pattern rounded-2xl bg-navy p-6 text-white shadow-card">
          <h2 class="font-serif text-xl font-bold">Une question ?</h2>
          <p class="mt-2 text-white/85">Le secrétariat paroissial est à votre écoute.</p>
          <NuxtLink to="/contact" class="btn btn-sm btn-gold mt-5">Nous contacter <Icon name="arrow" /></NuxtLink>
        </div>
      </aside>
    </div>
  </div>
</template>
