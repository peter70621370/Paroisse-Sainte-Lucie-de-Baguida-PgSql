<script setup lang="ts">
// Bandeau d'actualité : l'annonce la plus en avant (épinglée, sinon la plus récente).
const { data } = await useFetch<{ items: { id: number; title: string }[] }>('/api/announcements', { key: 'announcements-bar' });
const top = computed(() => data.value?.items[0]);
</script>

<template>
  <div v-if="top" class="bg-gold-dark text-sm text-white">
    <NuxtLink to="/actualites" class="group mx-auto flex max-w-6xl items-center gap-3 px-4 py-2 !outline-none">
      <span class="flex shrink-0 items-center gap-1.5 rounded-full bg-navy-deep px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider"><Icon name="megaphone" />Actualité</span>
      <span class="truncate underline-offset-4 group-hover:underline group-focus-visible:underline group-focus-visible:decoration-2">{{ top.title }}</span>
      <Icon name="arrow" class="ml-auto hidden shrink-0 transition group-hover:translate-x-1 sm:inline-block" />
    </NuxtLink>
  </div>
</template>
