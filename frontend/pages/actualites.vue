<script setup lang="ts">
type Ann = { id: number; title: string; content: string; pinned: boolean; publishedAt: string };
const { data } = await useFetch<{ items: Ann[] }>('/api/announcements', { query: useLocaleQuery() });
usePageSeo('Annonces paroissiales', 'Les annonces et actualités de la paroisse.');
</script>

<template>
  <div>
    <PageTitle :title="t(`Annonces paroissiales`)" :subtitle="t(`Les actualités de notre communauté`)" />
    <div class="mx-auto max-w-4xl space-y-6 px-4 py-12">
      <p v-if="!data?.items.length" class="card p-8 text-center text-slate-600">{{ t(`Aucune annonce pour le moment.`) }}</p>
      <article v-for="a in data?.items" :key="a.id" :class="['card flex gap-5 p-6 md:p-7', a.pinned ? 'border-gold/60 ring-1 ring-gold/40' : '']">
        <DateBadge :date="a.publishedAt" :tone="a.pinned ? 'gold' : 'navy'" class="hidden sm:flex" />
        <div class="min-w-0 flex-1">
          <p class="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gold-dark">
            <span v-if="a.pinned" class="rounded-full bg-gold-dark px-2.5 py-0.5 text-white">{{ t(`À la une`) }}</span>{{ longDate(a.publishedAt) }}
          </p>
          <h2 class="mt-1.5 font-serif text-2xl font-bold leading-snug text-navy">{{ a.title }}</h2>
          <!-- Contenu nettoyé côté serveur à l'enregistrement. -->
          <div class="rich mt-3" v-html="a.content" />
        </div>
      </article>
    </div>
  </div>
</template>
