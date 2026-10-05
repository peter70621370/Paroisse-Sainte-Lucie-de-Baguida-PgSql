<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' });
useHead({ title: 'Galerie – Administration', meta: [{ name: 'robots', content: 'noindex' }] });
</script>

<template>
  <ContentList title="Galerie : albums" resource="albums" route="/admin/albums" new-label="Nouvel album" extra-label="Éléments" :extra="(r) => String(r.items?.length ?? 0)" />
</template>
