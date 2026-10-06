<script setup lang="ts">
import type { GalleryItem } from '~/components/Lightbox.vue';

const route = useRoute();
const { data, error } = await useFetch<{ album: { slug: string; title: string; description: string | null; date: string | null; items: GalleryItem[] } }>(`/api/albums/${route.params.slug}`);
if (error.value || !data.value) throw createError({ statusCode: 404, statusMessage: 'Album introuvable', fatal: true });
const album = computed(() => data.value!.album);
const first = computed(() => album.value.items.find((i) => i.type === 'image'));
usePageSeo(() => album.value.title, () => album.value.description || `Album photos : ${album.value.title}`, () => ({ image: first.value?.url ?? null }));

const open = ref<number | null>(null);
</script>

<template>
  <div>
    <PageTitle :title="album.title" :subtitle="[album.date ? longDate(album.date) : '', album.description].filter(Boolean).join(' · ')" />
    <div class="mx-auto max-w-6xl px-4 py-10">
      <p v-if="!album.items.length" class="text-center text-slate-600">Cet album est vide pour le moment.</p>
      <ul class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <li v-for="(it, i) in album.items" :key="it.id">
          <button class="group relative block aspect-square w-full overflow-hidden rounded-lg bg-navy-dark" :aria-label="it.caption || (it.type === 'video' ? 'Ouvrir la vidéo' : 'Agrandir la photo')" @click="open = i">
            <img v-if="it.type === 'image'" :src="it.thumbUrl || it.url!" :alt="it.alt || it.caption || ''" class="h-full w-full object-cover transition group-hover:scale-105" loading="lazy" />
            <span v-else class="flex h-full w-full flex-col items-center justify-center gap-2 text-white"><span class="flex h-14 w-14 items-center justify-center rounded-full bg-gold-dark text-2xl" aria-hidden="true">▶</span><span class="px-2 text-center text-xs">{{ it.caption || 'Vidéo' }}</span></span>
          </button>
        </li>
      </ul>
      <NuxtLink to="/galerie" class="mt-8 inline-block text-sm text-navy underline">← Tous les albums</NuxtLink>
    </div>
    <Lightbox v-if="open !== null" v-model:index="open" :items="album.items" @close="open = null" />
  </div>
</template>
