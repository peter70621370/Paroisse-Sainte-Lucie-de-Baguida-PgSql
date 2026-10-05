<script setup lang="ts">
const route = useRoute();
const { data, error } = await useFetch<{ homily: { id: number; title: string; preacher: string | null; date: string; content: string | null; audioUrl: string | null; videoUrl: string | null } }>(`/api/homilies/${route.params.id}`);
if (error.value || !data.value) throw createError({ statusCode: 404, statusMessage: 'Homélie introuvable', fatal: true });
const h = computed(() => data.value!.homily);
usePageSeo(() => h.value.title, () => `Homélie du ${longDate(h.value.date)}${h.value.preacher ? ' – ' + h.value.preacher : ''}`);
</script>

<template>
  <div>
    <PageTitle :title="h.title" :subtitle="[longDate(h.date), h.preacher].filter(Boolean).join(' · ')" />
    <article class="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <VideoEmbed v-if="h.videoUrl" :url="h.videoUrl" />
      <audio v-if="h.audioUrl && /\.(mp3|m4a|ogg|wav)(\?|$)/i.test(h.audioUrl)" :src="h.audioUrl" controls class="w-full" />
      <a v-else-if="h.audioUrl" :href="h.audioUrl" target="_blank" rel="noopener noreferrer" class="inline-block rounded border border-navy px-4 py-2 text-navy hover:bg-navy hover:text-white">Écouter l'audio</a>
      <!-- Contenu nettoyé côté serveur à l'enregistrement. -->
      <div v-if="h.content" class="rich" v-html="h.content" />
      <NuxtLink to="/homelies" class="inline-block text-sm text-navy underline">← Toutes les homélies</NuxtLink>
    </article>
  </div>
</template>
