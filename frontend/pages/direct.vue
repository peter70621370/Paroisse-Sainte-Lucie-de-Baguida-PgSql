<script setup lang="ts">
const { s } = await useSite();
usePageSeo('Messe en direct', 'Suivez la messe de la paroisse en direct ou en replay.');
const url = computed(() => s.value['live.url']);
</script>

<template>
  <div>
    <PageTitle title="Messe en direct" subtitle="Suivez nos célébrations à distance" />
    <div class="mx-auto max-w-4xl px-4 py-10">
      <template v-if="url">
        <p v-if="s['live.label']" class="mb-4 text-center font-serif text-xl text-navy">{{ s['live.label'] }}</p>
        <VideoEmbed :url="url" title="Messe en direct" />
        <p class="mt-4 text-center text-sm text-slate-600">La vidéo se charge au clic. Si elle ne démarre pas, <a :href="url" target="_blank" rel="noopener noreferrer" class="text-navy underline">ouvrez-la directement</a>.</p>
      </template>
      <div v-else class="rounded-lg border border-gold/30 bg-white p-8 text-center shadow-sm">
        <p class="font-serif text-2xl font-semibold text-navy">Aucune diffusion en cours</p>
        <p class="mt-2 text-slate-600">Consultez les horaires des messes ; les retransmissions seront annoncées ici.</p>
        <NuxtLink to="/horaires" class="mt-5 inline-block rounded bg-navy px-5 py-2 text-white">Horaires des messes</NuxtLink>
      </div>
      <div v-if="s['social.youtube'] || s['social.facebook']" class="mt-8 flex flex-wrap justify-center gap-3 text-sm">
        <a v-if="s['social.youtube']" :href="s['social.youtube']" target="_blank" rel="noopener noreferrer" class="rounded border border-navy px-4 py-2 text-navy hover:bg-navy hover:text-white">Notre chaîne YouTube</a>
        <a v-if="s['social.facebook']" :href="s['social.facebook']" target="_blank" rel="noopener noreferrer" class="rounded border border-navy px-4 py-2 text-navy hover:bg-navy hover:text-white">Notre page Facebook</a>
      </div>
    </div>
  </div>
</template>
