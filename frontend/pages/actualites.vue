<script setup lang="ts">
type Ann = { id: number; title: string; content: string; pinned: boolean; publishedAt: string };
const { data } = await useFetch<{ items: Ann[] }>('/api/announcements', { key: 'announcements-bar' });
usePageSeo('Annonces paroissiales', 'Les annonces et actualités de la paroisse.');
</script>

<template>
  <div>
    <PageTitle title="Annonces paroissiales" subtitle="Les actualités de notre communauté" />
    <div class="mx-auto max-w-3xl space-y-5 px-4 py-10">
      <p v-if="!data?.items.length" class="text-center text-slate-600">Aucune annonce pour le moment.</p>
      <article v-for="a in data?.items" :key="a.id" class="rounded-lg border border-gold/30 bg-white p-5 shadow-sm">
        <p class="text-xs uppercase tracking-wide text-gold-dark">
          <span v-if="a.pinned" class="mr-2 rounded bg-gold-dark px-1.5 py-0.5 text-white">À la une</span>{{ longDate(a.publishedAt) }}
        </p>
        <h2 class="mt-1 font-serif text-2xl font-semibold text-navy">{{ a.title }}</h2>
        <!-- Contenu nettoyé côté serveur à l'enregistrement. -->
        <div class="rich mt-3" v-html="a.content" />
      </article>
    </div>
  </div>
</template>
