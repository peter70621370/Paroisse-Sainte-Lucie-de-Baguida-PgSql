<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' });
useHead({ title: 'Annonces – Administration', meta: [{ name: 'robots', content: 'noindex' }] });
</script>

<template>
  <ContentList title="Annonces paroissiales" resource="announcements" route="/admin/announcements" new-label="Nouvelle annonce" extra-label="" />
</template>
