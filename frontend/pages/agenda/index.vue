<script setup lang="ts">
usePageSeo('Agenda paroissial', 'Messes, célébrations et événements de la paroisse.');

type Ev = { id: number; title: string; location: string | null; startsAt: string; endsAt: string | null; allDay: boolean; category: { name: string; slug: string; color: string | null } | null };
type Item = { key: string; kind: 'event' | 'mass'; title: string; time: string; sort: string; color: string; to?: string; place?: string | null; category: string };

const route = useRoute();
const router = useRouter();
const nowYm = todayKey().slice(0, 7);
const ym = computed(() => (/^\d{4}-(0[1-9]|1[0-2])$/.test(String(route.query.m)) ? String(route.query.m) : nowYm));
const category = ref<string>('all'); // all | masses | <slug>
const view = ref<'month' | 'list'>('month');

const grid = computed(() => monthGrid(ym.value));
const query = computed(() => ({ from: grid.value.from, to: grid.value.to }));

const [{ data: evs }, { data: sched }, { data: cats }] = await Promise.all([
  useFetch<{ items: Ev[] }>('/api/events', { query, watch: [query] }),
  useFetch<{ items: ScheduleItem[] }>('/api/mass-schedules', { key: 'home-sched' }),
  useFetch<{ items: { id: number; name: string; slug: string; color: string | null }[] }>('/api/event-categories'),
]);

// Événements + messes hebdomadaires (répétées chaque semaine à partir des horaires), regroupés par jour.
const byDay = computed(() => {
  const map = new Map<string, Item[]>();
  const push = (day: string, it: Item) => (map.has(day) ? map.get(day)!.push(it) : map.set(day, [it]));

  for (const e of evs.value?.items ?? []) {
    if (category.value !== 'all' && category.value !== e.category?.slug) continue;
    const start = dayKey(e.startsAt);
    const end = e.endsAt ? dayKey(e.endsAt) : start;
    for (let d = start; d <= end && d <= grid.value.to; d = addDays(d, 1)) {
      if (d < grid.value.from) continue;
      push(d, {
        key: `e${e.id}-${d}`, kind: 'event', title: e.title, to: `/agenda/${e.id}`, place: e.location,
        time: e.allDay ? 'Journée' : d === start ? timeLabel(e.startsAt) : '', sort: e.allDay ? '00:00' : d === start ? timeLabel(e.startsAt).replace('h', ':').padStart(5, '0') : '00:00',
        color: e.category?.color || '#1F3A5F', category: e.category?.name ?? 'Événement',
      });
    }
  }
  if (category.value === 'all' || category.value === 'masses') {
    for (const week of grid.value.weeks) {
      for (const { key } of week) {
        for (const m of (sched.value?.items ?? []).filter((x) => x.weekday === WEEKDAY_KEYS[weekdayIndex(key)])) {
          push(key, {
            key: `m${m.id}-${key}`, kind: 'mass', title: kindLabel[m.kind] || m.notes || 'Célébration', time: hm(m.time), sort: m.time,
            color: '#86610A', place: m.location, category: 'Messes et confessions',
          });
        }
      }
    }
  }
  for (const list of map.values()) list.sort((a, b) => a.sort.localeCompare(b.sort));
  return map;
});

const listDays = computed(() =>
  [...byDay.value.entries()].filter(([k]) => k.startsWith(ym.value)).sort(([a], [b]) => a.localeCompare(b)),
);
const today = todayKey();
const go = (delta: number) => router.push({ query: { m: shiftMonth(ym.value, delta) } });
// Composant résolu explicitement : « <component is="NuxtLink"> » (texte) ne produirait pas un vrai lien.
const NuxtLink = resolveComponent('NuxtLink');
const weekNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
</script>

<template>
  <div>
    <PageTitle title="Agenda paroissial" subtitle="Messes, célébrations et événements" />
    <div class="mx-auto max-w-6xl px-4 py-12">
      <!-- Navigation et filtres -->
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <button class="flex h-10 w-10 items-center justify-center rounded-full border border-navy/50 text-navy hover:bg-navy hover:text-white" aria-label="Mois précédent" @click="go(-1)"><Icon name="chevron-left" /></button>
          <h2 class="min-w-48 text-center font-serif text-2xl font-bold capitalize text-navy md:text-3xl" aria-live="polite">{{ monthLabel(ym) }}</h2>
          <button class="flex h-10 w-10 items-center justify-center rounded-full border border-navy/50 text-navy hover:bg-navy hover:text-white" aria-label="Mois suivant" @click="go(1)"><Icon name="chevron-right" /></button>
          <NuxtLink v-if="ym !== nowYm" :to="{ query: {} }" class="ml-2 text-sm text-navy underline">Aujourd'hui</NuxtLink>
        </div>
        <div class="hidden gap-1 md:flex" role="group" aria-label="Affichage">
          <button :class="['rounded-l-full border border-navy px-4 py-2 text-sm font-semibold', view === 'month' ? 'bg-navy text-white' : 'text-navy']" @click="view = 'month'">Mois</button>
          <button :class="['rounded-r-full border border-navy px-4 py-2 text-sm font-semibold', view === 'list' ? 'bg-navy text-white' : 'text-navy']" @click="view = 'list'">Liste</button>
        </div>
      </div>

      <div class="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filtrer par catégorie">
        <button :class="['rounded-full border px-4 py-1.5 text-sm font-medium', category === 'all' ? 'border-navy bg-navy text-white' : 'border-navy/40 text-navy']" @click="category = 'all'">Tout</button>
        <button :class="['rounded-full border px-4 py-1.5 text-sm font-medium', category === 'masses' ? 'border-gold bg-gold-dark text-white' : 'border-gold/60 text-gold-dark']" @click="category = 'masses'">Messes et confessions</button>
        <button v-for="c in cats?.items" :key="c.id" :class="['rounded-full border px-4 py-1.5 text-sm font-medium', category === c.slug ? 'bg-navy text-white' : 'border-navy/40 text-navy']" @click="category = c.slug">{{ c.name }}</button>
      </div>

      <!-- Grille mensuelle (ordinateur) -->
      <div v-if="view === 'month'" class="card mt-6 hidden overflow-hidden md:block">
        <div class="grid grid-cols-7 bg-navy text-center text-sm font-semibold uppercase tracking-wider text-white">
          <div v-for="w in weekNames" :key="w" class="py-2">{{ w }}</div>
        </div>
        <div v-for="(week, wi) in grid.weeks" :key="wi" class="grid grid-cols-7 border-t border-slate-100">
          <div v-for="d in week" :key="d.key" :class="['min-h-28 border-l border-slate-100 p-1.5 first:border-l-0', d.inMonth ? '' : 'bg-cream-dark text-slate-600']">
            <p :class="['mb-1 text-right text-xs', d.key === today ? 'font-bold text-white' : '']">
              <span :class="d.key === today ? 'inline-block rounded-full bg-gold-dark px-1.5' : ''">{{ Number(d.key.slice(8)) }}</span>
            </p>
            <ul class="space-y-1">
              <li v-for="it in (byDay.get(d.key) ?? []).slice(0, 4)" :key="it.key">
                <component :is="it.to ? NuxtLink : 'div'" :to="it.to" class="block truncate rounded px-1.5 py-0.5 text-xs text-white" :style="{ backgroundColor: it.color, color: textOn(it.color) }" :title="`${it.time} ${it.title}`">
                  <span v-if="it.time" class="font-semibold">{{ it.time }}</span> {{ it.title }}
                </component>
              </li>
              <li v-if="(byDay.get(d.key) ?? []).length > 4" class="px-1 text-xs text-slate-600">+ {{ (byDay.get(d.key) ?? []).length - 4 }} autres</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Liste (mobile, ou choix « Liste ») -->
      <div :class="['mt-6 space-y-3', view === 'month' ? 'md:hidden' : '']">
        <p v-if="!listDays.length" class="text-center text-slate-600">Rien de prévu ce mois-ci.</p>
        <section v-for="[day, items] in listDays" :key="day" class="card overflow-hidden">
          <h3 :class="['px-4 py-2 font-serif text-lg font-semibold capitalize', day === today ? 'bg-gold-dark text-white' : 'bg-cream-dark text-navy']">{{ dayLong(day) }}</h3>
          <ul class="divide-y divide-slate-100">
            <li v-for="it in items" :key="it.key" class="flex items-baseline gap-3 px-4 py-2.5">
              <span class="w-14 shrink-0 font-serif font-bold" :style="{ color: readableOnWhite(it.color) }">{{ it.time }}</span>
              <div class="min-w-0">
                <NuxtLink v-if="it.to" :to="it.to" class="font-medium text-navy hover:underline">{{ it.title }}</NuxtLink>
                <span v-else class="font-medium">{{ it.title }}</span>
                <p class="text-xs text-slate-600">{{ it.category }}<span v-if="it.place"> · {{ it.place }}</span></p>
              </div>
            </li>
          </ul>
        </section>
      </div>
    </div>
  </div>
</template>
