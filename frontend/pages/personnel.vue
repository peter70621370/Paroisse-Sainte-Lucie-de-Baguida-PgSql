<script setup lang="ts">
type P = { id: number; fullName: string; function: string; bio: string | null; photo: { url: string; thumbUrl: string | null } | null };
const { data } = await useFetch<{ items: P[] }>('/api/staff');
usePageSeo('Personnel pastoral', 'Le curé, les prêtres, diacres et catéchistes de la paroisse.');
</script>

<template>
  <div>
    <PageTitle title="Personnel pastoral" subtitle="Ceux qui servent notre communauté" />
    <div class="mx-auto max-w-5xl px-4 py-10">
      <p v-if="!data?.items.length" class="text-center text-slate-500">Les fiches seront bientôt publiées.</p>
      <ul class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <li v-for="p in data?.items" :key="p.id" class="overflow-hidden rounded-lg border border-gold/30 bg-white text-center shadow-sm">
          <img :src="p.photo?.thumbUrl || p.photo?.url || PLACEHOLDERS.avatar" :alt="`Photo de ${p.fullName}`" class="aspect-square w-full object-cover" loading="lazy" />
          <div class="p-4">
            <h2 class="font-serif text-xl font-semibold text-navy">{{ p.fullName }}</h2>
            <p class="text-sm font-medium uppercase tracking-wide text-gold">{{ p.function }}</p>
            <p v-if="p.bio" class="mt-2 text-sm text-slate-600">{{ p.bio }}</p>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>
