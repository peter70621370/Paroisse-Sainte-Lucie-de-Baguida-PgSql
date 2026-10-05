<script setup lang="ts">
const route = useRoute();
const slug = String(route.params.slug);

const { data, error } = await useFetch<{ page: { title: string; excerpt: string | null; content: string; seoTitle: string | null; seoDescription: string | null } }>(`/api/pages/${slug}`);
if (error.value || !data.value) throw createError({ statusCode: 404, statusMessage: 'Page introuvable', fatal: true });

const page = computed(() => data.value!.page);
usePageSeo(() => page.value.seoTitle || page.value.title, () => page.value.seoDescription || page.value.excerpt);
</script>

<template>
  <div>
    <PageTitle :title="page.title" :subtitle="page.excerpt" />
    <!-- Contenu nettoyé côté serveur à l'enregistrement (balises de mise en forme uniquement). -->
    <article class="rich mx-auto max-w-3xl px-4 py-10" v-html="page.content" />
  </div>
</template>
