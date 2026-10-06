<script setup lang="ts">
type Bul = { id: number; title: string; date: string; file: { url: string } | null };
const route = useRoute();
const page = computed(() => Math.max(1, Number(route.query.page) || 1));
const { data } = await useFetch<{ items: Bul[]; total: number; pageSize: number }>('/api/bulletins', { query: computed(() => ({ page: page.value })), watch: [page] });
const pages = computed(() => Math.max(1, Math.ceil((data.value?.total ?? 0) / (data.value?.pageSize ?? 12))));
usePageSeo('Bulletins paroissiaux', 'Téléchargez les bulletins hebdomadaires de la paroisse.');
</script>

<template>
  <div>
    <PageTitle title="Bulletins paroissiaux" subtitle="Téléchargez le bulletin de la semaine" />
    <div class="mx-auto max-w-3xl px-4 py-10">
      <p v-if="!data?.items.length" class="text-center text-slate-600">Aucun bulletin publié pour le moment.</p>
      <ul class="space-y-3">
        <li v-for="b in data?.items" :key="b.id" class="flex items-center justify-between gap-4 rounded-lg border border-gold/30 bg-white p-4 shadow-sm">
          <div>
            <p class="font-serif text-lg font-semibold text-navy">{{ b.title }}</p>
            <p class="text-sm text-slate-600">{{ longDate(b.date) }}</p>
          </div>
          <a v-if="b.file" :href="b.file.url" target="_blank" rel="noopener" class="shrink-0 rounded bg-navy px-4 py-2 text-sm text-white hover:bg-navy-dark">Télécharger (PDF)</a>
        </li>
      </ul>
      <nav v-if="pages > 1" class="mt-6 flex items-center justify-center gap-4 text-sm" aria-label="Pagination">
        <NuxtLink v-if="page > 1" :to="{ query: { page: page - 1 } }" class="rounded border border-navy px-3 py-1 text-navy">Précédent</NuxtLink>
        <span>Page {{ page }} / {{ pages }}</span>
        <NuxtLink v-if="page < pages" :to="{ query: { page: page + 1 } }" class="rounded border border-navy px-3 py-1 text-navy">Suivant</NuxtLink>
      </nav>
    </div>
  </div>
</template>
