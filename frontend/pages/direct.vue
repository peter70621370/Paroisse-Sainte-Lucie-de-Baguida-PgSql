<script setup lang="ts">
const { s } = await useSite();
usePageSeo('Messe en direct', 'Suivez la messe de la paroisse en direct ou en replay.');
const url = computed(() => s.value['live.url']);
</script>

<template>
  <div>
    <PageTitle :title="t(`Messe en direct`)" :subtitle="t(`Suivez nos célébrations à distance`)" />
    <div class="mx-auto max-w-4xl px-4 py-12">
      <template v-if="url">
        <p v-if="s['live.label']" class="mb-4 text-center font-serif text-xl text-navy">{{ s['live.label'] }}</p>
        <VideoEmbed :url="url" :title="t(`Messe en direct`)" />
        <p class="mt-4 text-center text-sm text-slate-600">{{ t(`La vidéo se charge au clic. Si elle ne démarre pas,`) }} <a :href="url" target="_blank" rel="noopener noreferrer" class="text-navy underline">{{ t(`ouvrez-la directement`) }}</a>.</p>
      </template>
      <div v-else class="bg-pattern rounded-2xl bg-gradient-to-br from-navy to-navy-deep p-10 text-center text-white shadow-lift md:p-14">
        <span class="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gold-dark text-4xl"><Icon name="video" /></span>
        <p class="mt-6 font-serif text-3xl font-bold">{{ t(`Aucune diffusion en cours`) }}</p>
        <p class="mx-auto mt-3 max-w-lg text-lg text-white/85">{{ t(`Les messes retransmises seront annoncées ici. En attendant, retrouvez les horaires des célébrations et les dernières homélies.`) }}</p>
        <div class="mt-7 flex flex-wrap justify-center gap-3"><NuxtLink :to="lp('/horaires')" class="btn btn-gold"><Icon name="clock" />{{ t(`Horaires des messes`) }}</NuxtLink><NuxtLink :to="lp('/homelies')" class="btn btn-light"><Icon name="book" />{{ t(`Homélies`) }}</NuxtLink></div>
      </div>
      <div v-if="s['social.youtube'] || s['social.facebook']" class="mt-8 flex flex-wrap justify-center gap-3 text-sm">
        <a v-if="s['social.youtube']" :href="s['social.youtube']" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline"><Icon name="youtube" />{{ t(`Notre chaîne YouTube`) }}</a>
        <a v-if="s['social.facebook']" :href="s['social.facebook']" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline"><Icon name="facebook" />{{ t(`Notre page Facebook`) }}</a>
      </div>
    </div>
  </div>
</template>
