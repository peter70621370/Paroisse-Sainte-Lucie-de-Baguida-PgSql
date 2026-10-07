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
    <div class="mx-auto max-w-4xl px-4 py-12">
      <p v-if="!data?.items.length" class="card p-8 text-center text-slate-600">Aucune homélie publiée pour le moment.</p>
      <ul class="space-y-4">
        <li v-for="h in data?.items" :key="h.id">
          <NuxtLink :to="`/homelies/${h.id}`" class="card card-hover group flex items-center gap-5 p-5 md:p-6">
            <DateBadge :date="h.date" />
            <div class="min-w-0 flex-1">
              <p class="font-serif text-xl font-bold leading-snug text-navy md:text-2xl">{{ h.title }}</p>
              <p class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
                <span v-if="h.preacher">{{ h.preacher }}</span>
                <span class="flex items-center gap-1 font-medium text-gold-dark"><Icon name="book" />Texte</span>
                <span v-if="h.videoUrl" class="flex items-center gap-1 font-medium text-gold-dark"><Icon name="video" />Vidéo</span>
                <span v-if="h.audioUrl" class="flex items-center gap-1 font-medium text-gold-dark"><Icon name="mic" />Audio</span>
              </p>
            </div>
            <Icon name="arrow" class="hidden text-xl text-gold-dark transition group-hover:translate-x-1 sm:inline-block" />
          </NuxtLink>
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
