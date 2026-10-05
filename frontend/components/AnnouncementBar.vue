<script setup lang="ts">
// Bandeau d'actualité : l'annonce la plus en avant (épinglée, sinon la plus récente).
const { data } = await useFetch<{ items: { id: number; title: string }[] }>('/api/announcements', { key: 'announcements-bar' });
const top = computed(() => data.value?.items[0]);
</script>

<template>
  <div v-if="top" class="bg-gold text-sm text-white">
    <NuxtLink to="/actualites" class="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2 hover:underline">
      <span class="shrink-0 rounded bg-navy-dark px-2 py-0.5 text-xs font-semibold uppercase tracking-wide">Actualité</span>
      <span class="truncate">{{ top.title }}</span>
    </NuxtLink>
  </div>
</template>
