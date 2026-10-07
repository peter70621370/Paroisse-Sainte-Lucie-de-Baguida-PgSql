<script setup lang="ts">
type P = { id: number; fullName: string; function: string; bio: string | null; photo: { url: string; thumbUrl: string | null } | null };
const { data } = await useFetch<{ items: P[] }>('/api/staff');
usePageSeo('Personnel pastoral', 'Le curé, les prêtres, diacres et catéchistes de la paroisse.');

// Sans photo : initiales (on ignore les titres « Abbé », « Sœur », « M. », « Mme »…).
const initials = (name: string) =>
  name.split(/\s+/).filter((w) => !/^(abbé|père|sœur|soeur|frère|mgr|m\.|mme|mlle|dr)$/i.test(w)).map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
</script>

<template>
  <div>
    <PageTitle :title="t(`Personnel pastoral`)" :subtitle="t(`Ceux qui servent notre communauté`)" />
    <div class="mx-auto max-w-6xl px-4 py-12">
      <p v-if="!data?.items.length" class="card p-8 text-center text-slate-600">{{ t(`Les fiches seront bientôt publiées.`) }}</p>
      <ul class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <li v-for="p in data?.items" :key="p.id" class="card card-hover flex flex-col items-center p-7 text-center">
          <img v-if="p.photo" :src="p.photo.thumbUrl || p.photo.url" :alt="t(`Photo de {nom}`, { nom: p.fullName })" class="h-32 w-32 rounded-full object-cover ring-4 ring-gold/40 ring-offset-4 ring-offset-white" loading="lazy" />
          <div v-else class="bg-pattern flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-navy to-navy-deep font-serif text-4xl font-bold text-gold-light ring-4 ring-gold/40 ring-offset-4 ring-offset-white" aria-hidden="true">{{ initials(p.fullName) }}</div>
          <h2 class="mt-6 font-serif text-xl font-bold leading-snug text-navy">{{ p.fullName }}</h2>
          <p class="eyebrow mt-2">{{ t(p.function) }}</p>
          <div class="mx-auto mt-4 h-px w-10 bg-gold" aria-hidden="true" />
          <p v-if="p.bio" class="mt-4 text-[0.95rem] text-slate-600">{{ p.bio }}</p>
        </li>
      </ul>

      <div class="card mt-12 flex flex-wrap items-center justify-between gap-5 bg-cream-dark p-7">
        <div>
          <h2 class="font-serif text-2xl font-bold text-navy">{{ t(`Rencontrer un prêtre`) }}</h2>
          <p class="mt-1 text-slate-700">{{ t(`Pour une confession, un accompagnement ou une demande de sacrement, prenez rendez-vous auprès du secrétariat.`) }}</p>
        </div>
        <NuxtLink :to="lp('/contact')" class="btn btn-navy">{{ t(`Nous contacter`) }} <Icon name="arrow" /></NuxtLink>
      </div>
    </div>
  </div>
</template>
