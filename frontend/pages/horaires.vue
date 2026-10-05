<script setup lang="ts">
const { data } = await useFetch<{ items: ScheduleItem[] }>('/api/mass-schedules', { key: 'home-sched' });
const days = computed(() => groupByDay(data.value?.items ?? []));
usePageSeo('Horaires des messes', 'Horaires des messes, confessions et célébrations de la paroisse.');
</script>

<template>
  <div>
    <PageTitle title="Horaires des messes" subtitle="Messes, confessions et célébrations" />
    <div class="mx-auto max-w-3xl px-4 py-10">
      <p v-if="!days.length" class="text-center text-slate-500">Les horaires seront bientôt publiés.</p>
      <div v-for="d in days" :key="d.weekday" class="mb-4 overflow-hidden rounded-lg border border-gold/30 bg-white shadow-sm">
        <h2 class="bg-navy px-4 py-2 font-serif text-lg font-semibold text-white">{{ d.label }}</h2>
        <ul class="divide-y divide-slate-100">
          <li v-for="e in d.entries" :key="e.id" class="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-4 py-3">
            <span class="w-16 font-serif text-xl font-bold text-navy">{{ e.time.replace(':', 'h') }}</span>
            <span class="font-medium">{{ kindLabel[e.kind] || e.notes || 'Célébration' }}</span>
            <span class="text-sm text-slate-600">{{ [e.kind !== 'OTHER' ? e.notes : null, e.language, e.location].filter(Boolean).join(' · ') }}</span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
