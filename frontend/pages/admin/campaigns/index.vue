<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' });
useHead({ title: 'Campagnes – Administration', meta: [{ name: 'robots', content: 'noindex' }] });
</script>

<template>
  <ContentList title="Campagnes de dons" resource="campaigns" route="/admin/campaigns" new-label="Nouvelle campagne" extra-label="Objectif" :extra="(r) => (r.goalAmount ? formatAmount(r.goalAmount, 'XOF') : '—')" />
</template>
