<script setup lang="ts">
usePageSeo('Galerie', 'Photos et vidéos des célébrations et des événements de la paroisse.');

type Album = { slug: string; title: string; description: string | null; date: string | null; count: number; cover: { url: string; thumbUrl: string | null } | null };
const { data } = await useFetch<{ items: Album[] }>('/api/albums');
</script>

<template>
  <div>
    <PageTitle title="Galerie" subtitle="Photos et vidéos de la vie de la paroisse" />
    <div class="mx-auto max-w-6xl px-4 py-12">
      <p v-if="!data?.items.length" class="card p-8 text-center text-slate-600">Les albums seront bientôt publiés.</p>
      <ul class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <li v-for="a in data?.items" :key="a.slug">
          <NuxtLink :to="`/galerie/${a.slug}`" class="card card-hover group block overflow-hidden">
            <img :src="a.cover?.thumbUrl || a.cover?.url || PLACEHOLDERS.photo" :alt="`Album : ${a.title}`" class="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
            <div class="p-5">
              <p v-if="a.date" class="text-xs font-semibold uppercase tracking-wider text-gold-dark">{{ longDate(a.date) }}</p>
              <h2 class="mt-1 font-serif text-xl font-bold leading-snug text-navy">{{ a.title }}</h2>
              <p v-if="a.description" class="mt-1 text-[0.95rem] text-slate-600">{{ a.description }}</p>
              <p class="mt-3 flex items-center gap-1.5 text-sm font-medium text-slate-600"><Icon name="image" class="text-gold-dark" />{{ a.count }} élément{{ a.count > 1 ? 's' : '' }}</p>
            </div>
          </NuxtLink>
        </li>
      </ul>
    </div>
  </div>
</template>
