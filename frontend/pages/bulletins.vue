<script setup lang="ts">
type Bul = { id: number; title: string; date: string; file: { url: string } | null };
const route = useRoute();
const page = computed(() => Math.max(1, Number(route.query.page) || 1));
const { data } = await useFetch<{ items: Bul[]; total: number; pageSize: number }>('/api/bulletins', { query: computed(() => ({ page: page.value })), watch: [page] });
const pages = computed(() => Math.max(1, Math.ceil((data.value?.total ?? 0) / (data.value?.pageSize ?? 12))));
const latest = computed(() => (page.value === 1 ? data.value?.items[0] : undefined));
const others = computed(() => (latest.value ? data.value!.items.slice(1) : data.value?.items ?? []));
usePageSeo('Bulletins paroissiaux', 'Téléchargez les bulletins hebdomadaires de la paroisse.');
</script>

<template>
  <div>
    <PageTitle title="Bulletins paroissiaux" subtitle="Téléchargez le bulletin de la semaine" />
    <div class="mx-auto max-w-4xl px-4 py-12">
      <p v-if="!data?.items.length" class="card p-8 text-center text-slate-600">Aucun bulletin publié pour le moment.</p>

      <!-- Dernier bulletin, mis en avant -->
      <div v-if="latest" class="bg-pattern mb-10 flex flex-wrap items-center gap-6 rounded-2xl bg-gradient-to-br from-navy to-navy-deep p-7 text-white shadow-lift md:p-9">
        <span class="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gold-dark text-3xl"><Icon name="file" /></span>
        <div class="min-w-0 flex-1">
          <p class="eyebrow !text-gold-light">Dernier bulletin</p>
          <h2 class="mt-1 font-serif text-2xl font-bold leading-snug md:text-3xl">{{ latest.title }}</h2>
          <p class="mt-1 text-white/80">Paru le {{ longDate(latest.date) }}</p>
        </div>
        <a v-if="latest.file" :href="latest.file.url" target="_blank" rel="noopener" class="btn btn-gold"><Icon name="download" />Télécharger (PDF)</a>
      </div>

      <h2 v-if="others.length" class="mb-4 font-serif text-2xl font-bold text-navy">{{ latest ? 'Bulletins précédents' : 'Bulletins' }}</h2>
      <ul class="space-y-3">
        <li v-for="b in others" :key="b.id" class="card flex items-center gap-4 p-4 md:px-6">
          <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cream-dark text-xl text-gold-dark"><Icon name="file" /></span>
          <div class="min-w-0 flex-1">
            <p class="font-serif text-lg font-bold leading-snug text-navy">{{ b.title }}</p>
            <p class="text-sm text-slate-600">{{ longDate(b.date) }}</p>
          </div>
          <a v-if="b.file" :href="b.file.url" target="_blank" rel="noopener" class="btn btn-sm btn-outline shrink-0" :aria-label="`Télécharger ${b.title} (PDF)`"><Icon name="download" /><span class="hidden sm:inline">Télécharger (PDF)</span></a>
        </li>
      </ul>
      <nav v-if="pages > 1" class="mt-8 flex items-center justify-center gap-4 text-sm" aria-label="Pagination">
        <NuxtLink v-if="page > 1" :to="{ query: { page: page - 1 } }" class="btn btn-sm btn-outline"><Icon name="chevron-left" />Précédent</NuxtLink>
        <span>Page {{ page }} / {{ pages }}</span>
        <NuxtLink v-if="page < pages" :to="{ query: { page: page + 1 } }" class="btn btn-sm btn-outline">Suivant<Icon name="chevron-right" /></NuxtLink>
      </nav>
    </div>
  </div>
</template>
