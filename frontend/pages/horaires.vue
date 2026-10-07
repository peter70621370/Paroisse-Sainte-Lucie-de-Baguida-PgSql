<script setup lang="ts">
import type { IconName } from '~/components/Icon.vue';

const { data } = await useFetch<{ items: ScheduleItem[] }>('/api/mass-schedules', { key: 'home-sched' });
const days = computed(() => groupByDay(data.value?.items ?? []));
const todayWeekday = computed(() => WEEKDAY_KEYS[weekdayIndex(todayKey())]);
const kindIcon: Record<string, IconName> = { MASS: 'church', CONFESSION: 'hand', ADORATION: 'flame', OTHER: 'users' };
usePageSeo('Horaires des messes', 'Horaires des messes, confessions et célébrations de la paroisse.');
</script>

<template>
  <div>
    <PageTitle :title="t(`Horaires des messes`)" :subtitle="t(`Messes, confessions et célébrations`)" />
    <div class="mx-auto grid max-w-6xl gap-8 px-4 py-12 lg:grid-cols-3">
      <div class="lg:col-span-2">
        <p v-if="!days.length" class="card p-8 text-center text-slate-600">{{ t(`Les horaires seront bientôt publiés.`) }}</p>
        <div class="grid gap-5 sm:grid-cols-2">
          <section v-for="d in days" :key="d.weekday" :class="['card overflow-hidden', d.weekday === todayWeekday ? 'ring-2 ring-gold' : '', d.weekday === 'SUNDAY' ? 'sm:col-span-2' : '']">
            <h2 :class="['flex items-center justify-between px-5 py-3 font-serif text-xl font-bold text-white', d.weekday === 'SUNDAY' ? 'bg-gold-dark' : 'bg-navy']">
              {{ t(d.label) }}
              <span v-if="d.weekday === todayWeekday" class="rounded-full bg-white/20 px-2.5 py-0.5 font-sans text-xs font-semibold uppercase tracking-wider">{{ t(`Aujourd'hui`) }}</span>
            </h2>
            <ul :class="['divide-y divide-slate-100', d.weekday === 'SUNDAY' ? 'sm:grid sm:grid-cols-2 sm:divide-y-0' : '']">
              <li v-for="e in d.entries" :key="e.id" class="flex items-start gap-4 px-5 py-3.5">
                <span class="w-[4.2rem] shrink-0 font-serif text-2xl font-bold leading-tight text-navy">{{ hm(e.time) }}</span>
                <span class="min-w-0">
                  <span class="flex items-center gap-1.5 font-semibold text-slate-800"><Icon :name="kindIcon[e.kind] ?? 'church'" class="text-gold-dark" />{{ t(kindLabel[e.kind] || e.notes || 'Célébration') }}</span>
                  <span class="block text-sm text-slate-600">{{ [e.kind !== 'OTHER' ? e.notes : null, e.language].filter(Boolean).map((x) => t(x)).join(' · ') }}</span>
                </span>
              </li>
            </ul>
          </section>
        </div>
      </div>

      <aside class="space-y-5">
        <div class="card p-6">
          <h2 class="font-serif text-xl font-bold text-navy">{{ t(`Bon à savoir`) }}</h2>
          <ul class="mt-4 space-y-3 text-[0.95rem] text-slate-700">
            <li class="flex gap-2.5"><Icon name="check" class="mt-1 text-gold-dark" />{{ t(`Les horaires peuvent changer lors des grandes fêtes : consultez l'agenda et les annonces.`) }}</li>
            <li class="flex gap-2.5"><Icon name="check" class="mt-1 text-gold-dark" />{{ t(`Un prêtre est disponible pour les confessions sur rendez-vous, en dehors des horaires indiqués.`) }}</li>
            <li class="flex gap-2.5"><Icon name="check" class="mt-1 text-gold-dark" />{{ t(`Pour un malade ou une urgence, appelez le secrétariat.`) }}</li>
          </ul>
          <NuxtLink :to="lp('/agenda')" class="link-arrow mt-5 text-sm">{{ t(`Voir l'agenda`) }} <Icon name="arrow" /></NuxtLink>
        </div>
        <div class="bg-pattern rounded-2xl bg-navy p-6 text-white shadow-card">
          <Icon name="flame" class="text-3xl text-gold-light" />
          <h2 class="mt-3 font-serif text-xl font-bold">{{ t(`Confier une intention de messe`) }}</h2>
          <p class="mt-2 text-white/85">{{ t(`Action de grâce, défunt, intention particulière : faites votre demande en ligne.`) }}</p>
          <NuxtLink :to="lp('/demarches/intention-de-messe')" class="btn btn-sm btn-gold mt-5">{{ t(`Faire une demande`) }} <Icon name="arrow" /></NuxtLink>
        </div>
        <div class="card p-6">
          <Icon name="video" class="text-3xl text-gold-dark" />
          <h2 class="mt-3 font-serif text-xl font-bold text-navy">{{ t(`Vous ne pouvez pas vous déplacer ?`) }}</h2>
          <p class="mt-2 text-slate-700">{{ t(`Suivez la messe à distance, en direct ou en différé.`) }}</p>
          <NuxtLink :to="lp('/direct')" class="link-arrow mt-4 text-sm">{{ t(`Messe en direct`) }} <Icon name="arrow" /></NuxtLink>
        </div>
      </aside>
    </div>
  </div>
</template>
