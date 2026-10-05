<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' });
useHead({ title: 'Agenda – Administration', meta: [{ name: 'robots', content: 'noindex' }] });
const { user } = useAuth();
const fmt = (iso: string) => `${dayLong(dayKey(iso))} ${timeLabel(iso)}`;
</script>

<template>
  <div>
    <ContentList title="Agenda paroissial" resource="events" route="/admin/events" new-label="Nouvel événement" extra-label="Début" :extra="(r) => fmt(r.startsAt)" />
    <p v-if="user?.role !== 'CONTRIBUTOR'" class="mt-4 text-sm"><NuxtLink to="/admin/event-categories" class="text-navy underline">Gérer les catégories</NuxtLink></p>
    <p class="mt-2 text-xs text-slate-500">Les horaires sont ceux de la paroisse (Lomé, GMT). Les messes hebdomadaires de l'agenda viennent de « Horaires des messes ».</p>
  </div>
</template>
