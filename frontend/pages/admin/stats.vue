<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: ['admin', 'admin-staff'] });
useHead({ title: 'Statistiques – Administration', meta: [{ name: 'robots', content: 'noindex' }] });

type Stats = {
  days: number;
  totals: { views: number; visitors: number };
  series: { day: string; views: number; visitors: number }[];
  topPages: { path: string; views: number }[];
  referrers: { referrer: string; views: number }[];
  devices: { device: string; views: number }[];
};

const days = ref(30);
const { data } = await useAdminFetch<Stats>('/api/admin/analytics', { query: computed(() => ({ days: days.value })), watch: [days] });

const max = computed(() => Math.max(1, ...(data.value?.series.map((d) => d.views) ?? [1])));
const deviceTotal = computed(() => (data.value?.devices ?? []).reduce((n, d) => n + d.views, 0) || 1);
const deviceLabel: Record<string, string> = { mobile: 'Mobile', desktop: 'Ordinateur' };
const fmtDay = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' });
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-2xl font-bold text-navy">Statistiques de fréquentation</h1>
      <select v-model.number="days" class="rounded border border-slate-300 px-3 py-2 text-sm" aria-label="Période">
        <option :value="7">7 derniers jours</option>
        <option :value="30">30 derniers jours</option>
        <option :value="90">90 derniers jours</option>
      </select>
    </div>
    <p class="mt-1 text-sm text-slate-600">Mesure anonyme, sans cookie : seuls les visiteurs ayant accepté sont comptés. Aucune adresse IP ni donnée personnelle n'est conservée.</p>

    <div class="mt-4 grid gap-3 sm:grid-cols-3">
      <div class="rounded-xl bg-white p-4 shadow"><p class="text-xs text-slate-600">Pages vues</p><p class="mt-1 font-serif text-3xl font-bold text-navy">{{ data?.totals.views ?? 0 }}</p></div>
      <div class="rounded-xl bg-white p-4 shadow"><p class="text-xs text-slate-600">Visiteurs (cumul des jours)</p><p class="mt-1 font-serif text-3xl font-bold text-navy">{{ data?.totals.visitors ?? 0 }}</p></div>
      <div class="rounded-xl bg-white p-4 shadow"><p class="text-xs text-slate-600">Pages par visiteur</p><p class="mt-1 font-serif text-3xl font-bold text-navy">{{ data?.totals.visitors ? (data.totals.views / data.totals.visitors).toFixed(1) : '—' }}</p></div>
    </div>

    <section class="mt-6 rounded-xl bg-white p-5 shadow" aria-labelledby="chart-title">
      <h2 id="chart-title" class="font-semibold">Pages vues par jour</h2>
      <div class="mt-4 flex h-44 items-end gap-px" role="img" :aria-label="`Graphique des pages vues sur ${days} jours : ${data?.totals.views ?? 0} au total`">
        <div v-for="d in data?.series" :key="d.day" class="group relative flex h-full flex-1 flex-col justify-end" :title="`${fmtDay(d.day)} : ${d.views} vues, ${d.visitors} visiteurs`">
          <div class="w-full rounded-t bg-gold-dark" :style="{ height: `${(d.views / max) * 100}%`, minHeight: d.views ? '2px' : '0' }" />
        </div>
      </div>
      <div class="mt-1 flex justify-between text-xs text-slate-600"><span>{{ data?.series[0] && fmtDay(data.series[0].day) }}</span><span>{{ data?.series.at(-1) && fmtDay(data.series.at(-1)!.day) }}</span></div>
    </section>

    <div class="mt-6 grid gap-6 lg:grid-cols-3">
      <section class="rounded-xl bg-white p-5 shadow lg:col-span-2">
        <h2 class="font-semibold">Pages les plus vues</h2>
        <table class="mt-3 w-full text-left text-sm">
          <tbody>
            <tr v-for="p in data?.topPages" :key="p.path" class="border-b last:border-0"><td class="py-2 pr-3 font-mono text-xs">{{ p.path }}</td><td class="py-2 text-right font-semibold">{{ p.views }}</td></tr>
            <tr v-if="!data?.topPages.length"><td class="py-4 text-center text-slate-600">Aucune donnée pour le moment.</td></tr>
          </tbody>
        </table>
      </section>
      <div class="space-y-6">
        <section class="rounded-xl bg-white p-5 shadow">
          <h2 class="font-semibold">Appareils</h2>
          <ul class="mt-3 space-y-2 text-sm">
            <li v-for="d in data?.devices" :key="d.device">
              <div class="flex justify-between"><span>{{ deviceLabel[d.device] ?? d.device }}</span><span class="font-semibold">{{ Math.round((d.views / deviceTotal) * 100) }} %</span></div>
              <div class="mt-1 h-2 rounded-full bg-cream-dark"><div class="h-2 rounded-full bg-navy" :style="{ width: `${(d.views / deviceTotal) * 100}%` }" /></div>
            </li>
            <li v-if="!data?.devices.length" class="text-slate-600">—</li>
          </ul>
        </section>
        <section class="rounded-xl bg-white p-5 shadow">
          <h2 class="font-semibold">Sites d'origine</h2>
          <ul class="mt-3 space-y-1.5 text-sm">
            <li v-for="r in data?.referrers" :key="r.referrer" class="flex justify-between"><span class="truncate">{{ r.referrer }}</span><span class="font-semibold">{{ r.views }}</span></li>
            <li v-if="!data?.referrers.length" class="text-slate-600">Aucun (accès directs).</li>
          </ul>
        </section>
      </div>
    </div>
  </div>
</template>
