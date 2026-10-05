<script setup lang="ts">
const { s, name, hero } = await useSite();

type Ann = { id: number; title: string; content: string; pinned: boolean; publishedAt: string };
type Bul = { id: number; title: string; date: string; file: { url: string } | null };
type Hom = { id: number; title: string; preacher: string | null; date: string };

const [{ data: sched }, { data: anns }, { data: buls }, { data: homs }, { data: cure }, { data: evs }] = await Promise.all([
  useFetch<{ items: ScheduleItem[] }>('/api/mass-schedules', { key: 'home-sched' }),
  useFetch<{ items: Ann[] }>('/api/announcements', { key: 'announcements-bar' }),
  useFetch<{ items: Bul[] }>('/api/bulletins', { key: 'home-bul', query: { pageSize: 1 } }),
  useFetch<{ items: Hom[] }>('/api/homilies', { key: 'home-hom', query: { pageSize: 3 } }),
  useFetch<{ page: { title: string; excerpt: string | null } }>('/api/pages/mot-du-cure', { key: 'home-cure', onResponseError: () => {} }),
  useFetch<{ items: { id: number; title: string; location: string | null; startsAt: string; allDay: boolean }[] }>('/api/events', { key: 'home-events' }),
]);

const days = computed(() => groupByDay(sched.value?.items ?? []));
const tiles = [
  { to: '/horaires', title: 'Horaires des messes', text: 'Messes, confessions et célébrations' },
  { to: '/p/sacrements', title: 'Les sacrements', text: 'Baptême, mariage, communion…' },
  { to: '/p/catechese', title: 'Catéchèse', text: 'Formation des enfants et des adultes' },
  { to: '/p/jeunesse', title: 'Jeunesse', text: 'Mouvements, scouts et activités' },
  { to: '/p/sengager', title: 'S\'engager', text: 'Bénévolat et ministères' },
  { to: '/dons', title: 'Faire un don', text: 'Soutenir la vie de la paroisse' },
];

usePageSeo('', s.value['home.welcomeText'] || `Site officiel de la ${name.value}`);
</script>

<template>
  <div>
    <!-- Grande photo d'accueil -->
    <section class="relative isolate flex min-h-[420px] items-center justify-center overflow-hidden bg-navy-dark md:min-h-[520px]">
      <img :src="hero" alt="" class="absolute inset-0 -z-10 h-full w-full object-cover" fetchpriority="high" />
      <div class="absolute inset-0 -z-10 bg-gradient-to-b from-navy-dark/70 via-navy-dark/50 to-navy-dark/80" />
      <div class="mx-auto max-w-3xl px-4 py-12 text-center text-white">
        <p class="font-serif text-lg italic text-gold-light">{{ name }}</p>
        <h1 class="mt-2 font-serif text-4xl font-bold leading-tight md:text-5xl">{{ s['home.welcomeTitle'] || 'Bienvenue' }}</h1>
        <p v-if="s['home.welcomeText']" class="mx-auto mt-4 max-w-2xl text-white/90 md:text-lg">{{ s['home.welcomeText'] }}</p>
        <div class="mt-8 flex flex-wrap justify-center gap-3">
          <NuxtLink to="/horaires" class="rounded bg-gold px-6 py-3 font-medium text-white hover:bg-gold/90">Horaires des messes</NuxtLink>
          <NuxtLink to="/dons" class="rounded border border-white/70 px-6 py-3 font-medium text-white hover:bg-white/10">Faire un don</NuxtLink>
        </div>
      </div>
    </section>

    <!-- Cette semaine -->
    <section class="mx-auto max-w-6xl px-4 py-12">
      <h2 class="text-center font-serif text-3xl font-bold text-navy">Cette semaine à la paroisse</h2>
      <div class="mx-auto mt-2 h-0.5 w-16 bg-gold" />

      <div class="mt-8 grid gap-6 md:grid-cols-3">
        <article class="rounded-lg border border-gold/30 bg-white p-5 shadow-sm">
          <h3 class="font-serif text-xl font-semibold text-navy">Messes et confessions</h3>
          <dl v-if="days.length" class="mt-3 space-y-1.5 text-sm">
            <div v-for="d in days" :key="d.weekday" class="flex gap-2">
              <dt class="w-24 shrink-0 font-medium">{{ d.label }}</dt>
              <dd class="text-slate-700">{{ d.entries.map((e) => e.time.replace(':', 'h') + (e.kind === 'CONFESSION' ? ' (confessions)' : '')).join(' · ') }}</dd>
            </div>
          </dl>
          <p v-else class="mt-3 text-sm text-slate-500">Horaires bientôt disponibles.</p>
          <NuxtLink to="/horaires" class="mt-4 inline-block text-sm font-medium text-navy underline">Tous les horaires</NuxtLink>
        </article>

        <article class="rounded-lg border border-gold/30 bg-white p-5 shadow-sm">
          <h3 class="font-serif text-xl font-semibold text-navy">Annonces</h3>
          <ul v-if="anns?.items.length" class="mt-3 space-y-3 text-sm">
            <li v-for="a in anns.items.slice(0, 3)" :key="a.id">
              <p class="font-medium">{{ a.title }}</p>
              <p class="text-slate-600">{{ excerptOf(a.content, 90) }}</p>
            </li>
          </ul>
          <p v-else class="mt-3 text-sm text-slate-500">Aucune annonce pour le moment.</p>
          <NuxtLink to="/actualites" class="mt-4 inline-block text-sm font-medium text-navy underline">Toutes les annonces</NuxtLink>
        </article>

        <article class="rounded-lg border border-gold/30 bg-white p-5 shadow-sm">
          <h3 class="font-serif text-xl font-semibold text-navy">Bulletin paroissial</h3>
          <template v-if="buls?.items[0]">
            <p class="mt-3 text-sm font-medium">{{ buls.items[0].title }}</p>
            <p class="text-sm text-slate-600">{{ longDate(buls.items[0].date) }}</p>
            <a v-if="buls.items[0].file" :href="buls.items[0].file.url" target="_blank" rel="noopener" class="mt-4 inline-block rounded bg-navy px-4 py-2 text-sm text-white hover:bg-navy-dark">Télécharger (PDF)</a>
          </template>
          <p v-else class="mt-3 text-sm text-slate-500">Aucun bulletin publié pour le moment.</p>
          <div><NuxtLink to="/bulletins" class="mt-4 inline-block text-sm font-medium text-navy underline">Bulletins précédents</NuxtLink></div>
        </article>
      </div>
    </section>

    <!-- Prochains événements -->
    <section v-if="evs?.items.length" class="mx-auto max-w-6xl px-4 pb-12">
      <h2 class="text-center font-serif text-3xl font-bold text-navy">Prochains événements</h2>
      <div class="mx-auto mt-2 h-0.5 w-16 bg-gold" />
      <ul class="mt-8 grid gap-4 md:grid-cols-3">
        <li v-for="e in evs.items.slice(0, 3)" :key="e.id">
          <NuxtLink :to="`/agenda/${e.id}`" class="block h-full rounded-lg border border-gold/30 bg-white p-5 shadow-sm hover:shadow-md">
            <p class="text-xs font-semibold uppercase tracking-wide text-gold">{{ dayLong(dayKey(e.startsAt)) }}<span v-if="!e.allDay"> · {{ timeLabel(e.startsAt) }}</span></p>
            <p class="mt-1 font-serif text-lg font-semibold text-navy">{{ e.title }}</p>
            <p v-if="e.location" class="text-sm text-slate-600">{{ e.location }}</p>
          </NuxtLink>
        </li>
      </ul>
      <p class="mt-6 text-center"><NuxtLink to="/agenda" class="font-medium text-navy underline">Voir tout l'agenda</NuxtLink></p>
    </section>

    <!-- Raccourcis -->
    <section class="bg-cream-dark py-12">
      <div class="mx-auto max-w-6xl px-4">
        <h2 class="text-center font-serif text-3xl font-bold text-navy">Vivre sa foi, s'impliquer</h2>
        <div class="mx-auto mt-2 h-0.5 w-16 bg-gold" />
        <ul class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <li v-for="t in tiles" :key="t.to">
            <NuxtLink :to="t.to" class="block h-full rounded-lg border-l-4 border-gold bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <span class="font-serif text-xl font-semibold text-navy">{{ t.title }}</span>
              <span class="mt-1 block text-sm text-slate-600">{{ t.text }}</span>
            </NuxtLink>
          </li>
        </ul>
      </div>
    </section>

    <!-- Mot du curé -->
    <section v-if="cure?.page" class="mx-auto max-w-3xl px-4 py-12 text-center">
      <h2 class="font-serif text-3xl font-bold text-navy">{{ cure.page.title }}</h2>
      <div class="mx-auto mt-2 h-0.5 w-16 bg-gold" />
      <p v-if="cure.page.excerpt" class="mt-5 font-serif text-lg italic text-slate-700">« {{ cure.page.excerpt }} »</p>
      <NuxtLink to="/p/mot-du-cure" class="mt-5 inline-block font-medium text-navy underline">Lire le message</NuxtLink>
    </section>

    <!-- Homélies récentes -->
    <section v-if="homs?.items.length" class="mx-auto max-w-6xl px-4 pb-4">
      <h2 class="text-center font-serif text-3xl font-bold text-navy">Dernières homélies</h2>
      <div class="mx-auto mt-2 h-0.5 w-16 bg-gold" />
      <ul class="mt-8 grid gap-4 md:grid-cols-3">
        <li v-for="h in homs.items" :key="h.id">
          <NuxtLink :to="`/homelies/${h.id}`" class="block h-full rounded-lg border border-gold/30 bg-white p-5 shadow-sm hover:shadow-md">
            <p class="text-xs uppercase tracking-wide text-gold">{{ longDate(h.date) }}</p>
            <p class="mt-1 font-serif text-lg font-semibold text-navy">{{ h.title }}</p>
            <p v-if="h.preacher" class="text-sm text-slate-600">{{ h.preacher }}</p>
          </NuxtLink>
        </li>
      </ul>
    </section>
  </div>
</template>
