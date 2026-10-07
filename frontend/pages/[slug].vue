<script setup lang="ts">
// Adresse courte : « /histoire » renvoie vers « /p/histoire » si une page publiée porte ce nom, sinon 404.
const route = useRoute();
const slug = String(route.params.slug);
const { data } = await useFetch<{ locales: string[] }>(`/api/pages/${slug}/locales`, { key: `locales-${slug}`, onResponseError: () => {} });
if (!data.value?.locales.length) throw createError({ statusCode: 404, statusMessage: 'Page introuvable', fatal: true });
await navigateTo({ path: `/p/${slug}`, query: route.query }, { redirectCode: 301 });
</script>

<template>
  <div />
</template>
