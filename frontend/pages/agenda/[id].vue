<script setup lang="ts">
const route = useRoute();
const { data, error } = await useFetch<{ event: { id: number; title: string; description: string | null; location: string | null; startsAt: string; endsAt: string | null; allDay: boolean; category: { name: string } | null } }>(`/api/events/${route.params.id}`);
if (error.value || !data.value) throw createError({ statusCode: 404, statusMessage: 'Événement introuvable', fatal: true });
const e = computed(() => data.value!.event);

const when = computed(() => {
  const start = dayKey(e.value.startsAt);
  const end = e.value.endsAt ? dayKey(e.value.endsAt) : start;
  if (e.value.allDay) return start === end ? `${dayLong(start)} (${t('toute la journée')})` : t('Du {a} au {b}', { a: dayLong(start), b: dayLong(end) });
  if (start === end) return `${dayLong(start)}, ${timeLabel(e.value.startsAt)}${e.value.endsAt ? ' – ' + timeLabel(e.value.endsAt) : ''}`;
  return t('Du {a} à {h1} au {b} à {h2}', { a: dayLong(start), h1: timeLabel(e.value.startsAt), b: dayLong(end), h2: timeLabel(e.value.endsAt!) });
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
    <PageTitle :title="e.title" :subtitle="t(e.category?.name)" />
    <article class="mx-auto max-w-3xl px-4 py-12">
      <div class="card overflow-hidden">
        <dl class="grid divide-y divide-gold/20 bg-cream-dark sm:grid-cols-2 sm:divide-x sm:divide-y-0">
          <div class="flex gap-4 p-6">
            <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-navy text-xl text-gold-light"><Icon name="calendar" /></span>
            <div><dt class="eyebrow">{{ t(`Quand`) }}</dt><dd class="mt-1 font-semibold text-navy first-letter:uppercase">{{ when }}</dd></div>
          </div>
          <div v-if="e.location" class="flex gap-4 p-6">
            <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-navy text-xl text-gold-light"><Icon name="pin" /></span>
            <div><dt class="eyebrow">{{ t(`Où`) }}</dt><dd class="mt-1 font-semibold text-navy">{{ e.location }}</dd></div>
          </div>
        </dl>
        <div v-if="e.description" class="p-6 md:p-8">
          <h2 class="font-serif text-xl font-bold text-navy">{{ t(`Détails`) }}</h2>
          <p class="mt-3 whitespace-pre-line text-lg leading-relaxed text-slate-700">{{ e.description }}</p>
        </div>
      </div>
      <NuxtLink :to="lp('/agenda')" class="link-arrow mt-8"><Icon name="chevron-left" />{{ t(`Retour à l'agenda`) }}</NuxtLink>
    </article>
  </div>
</template>
