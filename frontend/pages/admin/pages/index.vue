<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' });
useHead({ title: 'Pages – Administration', meta: [{ name: 'robots', content: 'noindex' }] });
</script>

<template>
  <ContentList title="Pages" resource="pages" route="/admin/pages" new-label="Nouvelle page" extra-label="Adresse" :extra="(r) => `/${r.slug}${r.locale !== 'fr' ? ' (' + r.locale + ')' : ''}`" />
</template>
