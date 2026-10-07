<script setup lang="ts">
const route = useRoute();
const slug = String(route.params.slug);

// Langue : celle de l'adresse (« /p/… » français, « /en/p/… » anglais). Une page sans traduction s'affiche en français, avec une mention.
// « ?lang=ee » affiche la version éwé si elle existe (en attendant l'ouverture du site en éwé).
const { data } = await usePageContent(slug, route.query.lang === 'ee' ? 'ee' : undefined);
if (!data.value) throw createError({ statusCode: 404, statusMessage: 'Page introuvable', fatal: true });

const page = computed(() => data.value!);
const path = computed(() => barePath(route.path));

// Rubrique du menu à laquelle appartient la page (pour proposer les pages voisines).
const section = computed(() => NAV.find((n) => n.children?.some((c) => c.to === path.value)));

usePageSeo(() => page.value.seoTitle || page.value.title, () => page.value.seoDescription || page.value.excerpt, () => ({
  lang: page.value.locale,
  canonical: page.value.locale === 'ee' ? `${route.path}?lang=ee` : route.path,
}));
</script>

<template>
  <div>
    <PageTitle :title="page.title" :subtitle="page.excerpt" />
    <div :class="['mx-auto grid gap-10 px-4 py-12', section ? 'max-w-6xl lg:grid-cols-[minmax(0,1fr)_19rem]' : 'max-w-3xl']">
      <div class="min-w-0">
        <p v-if="page.fallback" class="mb-6 rounded-xl border border-gold/40 bg-cream-dark/70 px-4 py-3 text-[0.95rem] text-slate-700" role="note">{{ t(`Cette page n'est pas encore disponible dans cette langue : elle est affichée en français.`) }}</p>
        <!-- Contenu nettoyé côté serveur à l'enregistrement (balises de mise en forme uniquement). -->
        <article class="rich text-lg" :lang="page.locale" v-html="page.content" />
      </div>

      <aside v-if="section" class="space-y-5">
        <nav class="card overflow-hidden" :aria-label="t(section.label)">
          <h2 class="bg-navy px-5 py-3 font-serif text-lg font-bold text-white">{{ t(section.label) }}</h2>
          <ul class="divide-y divide-slate-100">
            <li v-for="c in section.children" :key="c.to">
              <NuxtLink :to="lp(c.to)" :class="['flex items-center justify-between gap-2 px-5 py-3 text-[0.95rem] transition hover:bg-cream', c.to === path ? 'border-l-4 border-gold bg-cream font-semibold text-navy' : 'text-slate-700']" :aria-current="c.to === path ? 'page' : undefined">
                {{ t(c.label) }}<Icon name="chevron-right" class="text-gold-dark" />
              </NuxtLink>
            </li>
          </ul>
        </nav>
        <div class="bg-pattern rounded-2xl bg-navy p-6 text-white shadow-card">
          <h2 class="font-serif text-xl font-bold">{{ t(`Une question ?`) }}</h2>
          <p class="mt-2 text-white/85">{{ t(`Le secrétariat paroissial est à votre écoute.`) }}</p>
          <NuxtLink :to="lp('/contact')" class="btn btn-sm btn-gold mt-5">{{ t(`Nous contacter`) }} <Icon name="arrow" /></NuxtLink>
        </div>
      </aside>
    </div>
  </div>
</template>
