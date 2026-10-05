<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' });
useHead({ title: 'Homélies – Administration', meta: [{ name: 'robots', content: 'noindex' }] });
</script>

<template>
  <ContentList title="Homélies" resource="homilies" route="/admin/homilies" new-label="Nouvelle homélie" extra-label="Date" :extra="(r) => fmtDate(r.date)" />
</template>
