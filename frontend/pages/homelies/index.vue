<script setup lang="ts">
type Hom = { id: number; title: string; preacher: string | null; date: string; videoUrl: string | null; audioUrl: string | null };
const route = useRoute();
const page = computed(() => Math.max(1, Number(route.query.page) || 1));
const { data } = await useFetch<{ items: Hom[]; total: number; pageSize: number }>('/api/homilies', { query: computed(() => ({ page: page.value })), watch: [page] });
const pages = computed(() => Math.max(1, Math.ceil((data.value?.total ?? 0) / (data.value?.pageSize ?? 12))));
usePageSeo('Homélies', 'Les homélies de la paroisse : texte, audio et vidéo.');
</script>

<template>
  <div>
    <PageTitle title="Homélies" subtitle="Textes, audios et vidéos" />
    <div class="mx-auto max-w-3xl px-4 py-10">
      <p v-if="!data?.items.length" class="text-center text-slate-600">Aucune homélie publiée pour le moment.</p>
      <ul class="space-y-3">
        <li v-for="h in data?.items" :key="h.id">
          <NuxtLink :to="`/homelies/${h.id}`" class="block rounded-lg border border-gold/30 bg-white p-4 shadow-sm hover:shadow-md">
            <p class="text-xs uppercase tracking-wide text-gold-dark">{{ longDate(h.date) }}</p>
            <p class="font-serif text-xl font-semibold text-navy">{{ h.title }}</p>
            <p class="text-sm text-slate-600">
              {{ h.preacher }}<span v-if="h.videoUrl"> · Vidéo</span><span v-if="h.audioUrl"> · Audio</span>
            </p>
          </NuxtLink>
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
