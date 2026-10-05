<script setup lang="ts">
const route = useRoute();
const { data, error } = await useFetch<{ event: { id: number; title: string; description: string | null; location: string | null; startsAt: string; endsAt: string | null; allDay: boolean; category: { name: string } | null } }>(`/api/events/${route.params.id}`);
if (error.value || !data.value) throw createError({ statusCode: 404, statusMessage: 'Événement introuvable', fatal: true });
const e = computed(() => data.value!.event);

const when = computed(() => {
  const start = dayKey(e.value.startsAt);
  const end = e.value.endsAt ? dayKey(e.value.endsAt) : start;
  if (e.value.allDay) return start === end ? `${dayLong(start)} (toute la journée)` : `Du ${dayLong(start)} au ${dayLong(end)}`;
  if (start === end) return `${dayLong(start)}, ${timeLabel(e.value.startsAt)}${e.value.endsAt ? ' – ' + timeLabel(e.value.endsAt) : ''}`;
  return `Du ${dayLong(start)} à ${timeLabel(e.value.startsAt)} au ${dayLong(end)} à ${timeLabel(e.value.endsAt!)}`;
});
usePageSeo(() => e.value.title, () => `${when.value}${e.value.location ? ' – ' + e.value.location : ''}`);
useJsonLd(() => ({
  '@type': 'Event',
  name: e.value.title,
  description: e.value.description || undefined,
  startDate: e.value.startsAt,
  endDate: e.value.endsAt || undefined,
  eventStatus: 'https://schema.org/EventScheduled',
  eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
  location: e.value.location ? { '@type': 'Place', name: e.value.location } : undefined,
  organizer: { '@type': 'Organization', name: 'Paroisse Sainte Lucie de Baguida' },
}));
</script>

<template>
  <div>
    <PageTitle :title="e.title" :subtitle="e.category?.name" />
    <article class="mx-auto max-w-2xl px-4 py-10">
      <dl class="space-y-4 rounded-lg border border-gold/30 bg-white p-6 shadow-sm">
        <div>
          <dt class="text-xs font-semibold uppercase tracking-wide text-gold">Quand</dt>
          <dd class="mt-1">{{ when }}</dd>
        </div>
        <div v-if="e.location">
          <dt class="text-xs font-semibold uppercase tracking-wide text-gold">Où</dt>
          <dd class="mt-1">{{ e.location }}</dd>
        </div>
        <div v-if="e.description">
          <dt class="text-xs font-semibold uppercase tracking-wide text-gold">Détails</dt>
          <dd class="mt-1 whitespace-pre-line">{{ e.description }}</dd>
        </div>
      </dl>
      <NuxtLink to="/agenda" class="mt-6 inline-block text-sm text-navy underline">← Retour à l'agenda</NuxtLink>
    </article>
  </div>
</template>
