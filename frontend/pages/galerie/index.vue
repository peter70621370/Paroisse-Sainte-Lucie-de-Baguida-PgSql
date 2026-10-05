<script setup lang="ts">
usePageSeo('Galerie', 'Photos et vidéos des célébrations et des événements de la paroisse.');

type Album = { slug: string; title: string; description: string | null; date: string | null; count: number; cover: { url: string; thumbUrl: string | null } | null };
const { data } = await useFetch<{ items: Album[] }>('/api/albums');
</script>

<template>
  <div>
    <PageTitle title="Galerie" subtitle="Photos et vidéos de la vie de la paroisse" />
    <div class="mx-auto max-w-6xl px-4 py-10">
      <p v-if="!data?.items.length" class="text-center text-slate-500">Les albums seront bientôt publiés.</p>
      <ul class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <li v-for="a in data?.items" :key="a.slug">
          <NuxtLink :to="`/galerie/${a.slug}`" class="group block overflow-hidden rounded-lg border border-gold/30 bg-white shadow-sm transition hover:shadow-md">
            <img :src="a.cover?.thumbUrl || a.cover?.url || PLACEHOLDERS.photo" :alt="`Album : ${a.title}`" class="aspect-[4/3] w-full object-cover transition group-hover:scale-105" loading="lazy" />
            <div class="p-4">
              <h2 class="font-serif text-xl font-semibold text-navy">{{ a.title }}</h2>
              <p class="text-sm text-slate-600"><span v-if="a.date">{{ longDate(a.date) }} · </span>{{ a.count }} élément{{ a.count > 1 ? 's' : '' }}</p>
            </div>
          </NuxtLink>
        </li>
      </ul>
    </div>
  </div>
</template>
