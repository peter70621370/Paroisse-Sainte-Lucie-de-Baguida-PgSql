<script setup lang="ts">
import type { IconName } from '~/components/Icon.vue';

const { s, name, hero, hours } = await useSite();

type Ann = { id: number; title: string; content: string; pinned: boolean; publishedAt: string };
type Bul = { id: number; title: string; date: string; file: { url: string } | null };
type Hom = { id: number; title: string; preacher: string | null; date: string };
type Ev = { id: number; title: string; location: string | null; startsAt: string; allDay: boolean; category: { name: string; color: string | null } | null };
type Camp = { slug: string; title: string; description: string | null; goalAmount: number | null; raised: number; percent: number | null; donors: number };
type Alb = { slug: string; title: string; date: string | null; count: number; cover: { url: string; thumbUrl: string | null } | null };

const [{ data: sched }, { data: anns }, { data: buls }, { data: homs }, { data: cure }, { data: evs }, { data: camps }, { data: albs }] = await Promise.all([
  useFetch<{ items: ScheduleItem[] }>('/api/mass-schedules', { key: 'home-sched' }),
  useFetch<{ items: Ann[] }>('/api/announcements', { key: 'announcements-bar' }),
  useFetch<{ items: Bul[] }>('/api/bulletins', { key: 'home-bul', query: { pageSize: 1 } }),
  useFetch<{ items: Hom[] }>('/api/homilies', { key: 'home-hom', query: { pageSize: 3 } }),
  usePageContent('mot-du-cure'),
  useFetch<{ items: Ev[] }>('/api/events', { key: 'home-events' }),
  useFetch<{ items: Camp[] }>('/api/campaigns', { key: 'home-camps' }),
  useFetch<{ items: Alb[] }>('/api/albums', { key: 'home-albums' }),
]);

const days = computed(() => groupByDay(sched.value?.items ?? []));
const campaign = computed(() => [...(camps.value?.items ?? [])].sort((a, b) => (b.goalAmount ?? 0) - (a.goalAmount ?? 0))[0]);

// Prochaine messe, d'après les horaires hebdomadaires (heure de la paroisse).
const nextMass = computed(() => {
  const masses = (sched.value?.items ?? []).filter((m) => m.kind === 'MASS');
  const today = todayKey();
  const now = timeKey(new Date());
  for (let i = 0; i < 8; i++) {
    const day = addDays(today, i);
    const found = masses.filter((m) => m.weekday === WEEKDAY_KEYS[weekdayIndex(day)] && (i > 0 || m.time > now)).sort((a, b) => a.time.localeCompare(b.time))[0];
    if (found) return { when: t(i === 0 ? 'Aujourd\'hui' : i === 1 ? 'Demain' : weekdayLabel[found.weekday]), time: hm(found.time), detail: [found.notes, found.language].filter(Boolean).map((x) => t(x)).join(' · ') };
  }
  return null;
});

const tiles: { to: string; title: string; text: string; icon: IconName }[] = [
  { to: '/horaires', title: 'Horaires des messes', text: 'Messes, confessions et adoration', icon: 'clock' },
  { to: '/p/sacrements', title: 'Les sacrements', text: 'Baptême, mariage, communion…', icon: 'drop' },
  { to: '/p/catechese', title: 'Catéchèse', text: 'Formation des enfants et des adultes', icon: 'book' },
  { to: '/p/jeunesse', title: 'Jeunesse', text: 'Mouvements, scouts et activités', icon: 'users' },
  { to: '/p/sengager', title: 'S\'engager', text: 'Bénévolat et ministères', icon: 'hand' },
  { to: '/demarches/intention-de-messe', title: 'Intention de messe', text: 'Confier une intention de prière', icon: 'flame' },
];

usePageSeo('', s.value['home.welcomeText'] || t('Site officiel de la {nom}', { nom: name.value }), () => ({ image: s.value['home.heroImage'] || null }));

// Données structurées pour Google : la paroisse comme lieu de culte.
const { siteUrl } = useRuntimeConfig().public;
const abs = (u: string) => (/^https?:\/\//.test(u) ? u : siteUrl + u);
useJsonLd(() => ({
  '@type': 'CatholicChurch',
  name: name.value,
  url: siteUrl,
  logo: abs(s.value['site.logo'] || PLACEHOLDERS.logo),
  image: abs(s.value['home.heroImage'] || PLACEHOLDERS.og),
  telephone: s.value['site.phone'] || undefined,
  email: s.value['site.contactEmail'] || undefined,
  address: s.value['site.address'] ? { '@type': 'PostalAddress', streetAddress: s.value['site.address'], addressCountry: 'TG' } : undefined,
  sameAs: [s.value['social.facebook'], s.value['social.youtube']].filter(Boolean),
}));
</script>

<template>
  <div>
    <!-- Grande photo d'accueil -->
    <section class="relative isolate flex min-h-[520px] items-center overflow-hidden bg-navy-deep md:min-h-[640px]">
      <img :src="hero" :srcset="responsiveSrcset(s['home.heroImage'])" sizes="100vw" alt="" class="absolute inset-0 -z-10 h-full w-full object-cover" fetchpriority="high" decoding="async" />
      <div class="absolute inset-0 -z-10 bg-gradient-to-r from-navy-deep/90 via-navy-deep/65 to-navy-deep/25" />
      <div class="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-navy-deep/80 to-transparent" />
      <div class="mx-auto w-full max-w-6xl px-4 pb-28 pt-16 text-white md:pb-36">
        <div class="max-w-2xl">
          <p class="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.25em] text-gold-light"><span class="h-px w-10 bg-gold-light" aria-hidden="true" />{{ name }}</p>
          <h1 class="mt-4 font-serif text-4xl font-bold leading-[1.1] md:text-6xl">{{ s['home.welcomeTitle'] || t(`Bienvenue`) }}</h1>
          <p v-if="s['home.welcomeText']" class="mt-5 max-w-xl text-lg text-white/90 md:text-xl">{{ s['home.welcomeText'] }}</p>
          <div class="mt-8 flex flex-wrap gap-3">
            <NuxtLink :to="lp('/horaires')" class="btn btn-gold"><Icon name="clock" />{{ t(`Horaires des messes`) }}</NuxtLink>
            <NuxtLink :to="lp('/dons')" class="btn btn-light"><Icon name="heart" />{{ t(`Faire un don`) }}</NuxtLink>
          </div>
        </div>
      </div>
    </section>

    <!-- Infos pratiques, à cheval sur la photo -->
    <section class="relative z-10 mx-auto -mt-20 max-w-6xl px-4" :aria-label="t(`Informations pratiques`)">
      <ul class="card grid divide-y divide-gold/20 overflow-hidden md:grid-cols-3 md:divide-x md:divide-y-0">
        <li class="flex gap-4 p-6">
          <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-navy text-xl text-gold-light"><Icon name="church" /></span>
          <div>
            <p class="eyebrow">{{ t(`Prochaine messe`) }}</p>
            <template v-if="nextMass">
              <p class="mt-1 font-serif text-xl font-bold text-navy">{{ t(`{quand} à {heure}`, { quand: nextMass.when, heure: nextMass.time }) }}</p>
              <p v-if="nextMass.detail" class="text-sm text-slate-600">{{ nextMass.detail }}</p>
            </template>
            <p v-else class="mt-1 text-slate-600">{{ t(`Horaires bientôt disponibles.`) }}</p>
            <NuxtLink :to="lp('/horaires')" class="link-arrow mt-2 text-sm">{{ t(`Tous les horaires`) }} <Icon name="arrow" /></NuxtLink>
          </div>
        </li>
        <li class="flex gap-4 p-6">
          <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-navy text-xl text-gold-light"><Icon name="clock" /></span>
          <div>
            <p class="eyebrow">{{ t(`Secrétariat`) }}</p>
            <p v-if="hours.length" class="mt-1 font-serif text-xl font-bold text-navy">{{ hours[0]!.split(':')[0] }}</p>
            <p v-if="hours.length" class="text-sm text-slate-600">{{ hours[0]!.split(':').slice(1).join(':').trim() }}</p>
            <p v-else class="mt-1 text-slate-600">{{ t(`Le secrétariat vous accueille.`) }}</p>
            <NuxtLink :to="lp('/contact')" class="link-arrow mt-2 text-sm">{{ t(`Nous contacter`) }} <Icon name="arrow" /></NuxtLink>
          </div>
        </li>
        <li class="flex gap-4 p-6">
          <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-navy text-xl text-gold-light"><Icon name="video" /></span>
          <div>
            <p class="eyebrow">{{ t(`Messe en direct`) }}</p>
            <p class="mt-1 font-serif text-xl font-bold text-navy">{{ s['live.url'] ? t(`Suivez la célébration`) : t(`À distance, avec nous`) }}</p>
            <p v-if="s['live.label']" class="text-sm text-slate-600">{{ s['live.label'] }}</p>
            <NuxtLink :to="lp('/direct')" class="link-arrow mt-2 text-sm">{{ s['live.url'] ? t(`Suivre la messe`) : t(`En savoir plus`) }} <Icon name="arrow" /></NuxtLink>
          </div>
        </li>
      </ul>
    </section>

    <!-- Cette semaine -->
    <section class="mx-auto max-w-6xl px-4 py-16 md:py-20">
      <SectionTitle :eyebrow="t(`La vie de la communauté`)" :title="t(`Cette semaine à la paroisse`)" />

      <div class="mt-10 grid gap-6 lg:grid-cols-3">
        <article class="card flex flex-col p-6">
          <h3 class="flex items-center gap-2.5 font-serif text-xl font-bold text-navy"><Icon name="clock" class="text-gold-dark" />{{ t(`Messes et confessions`) }}</h3>
          <dl v-if="days.length" class="mt-4 divide-y divide-slate-100 text-[0.95rem]">
            <div v-for="d in days" :key="d.weekday" class="flex gap-3 py-2">
              <dt class="w-24 shrink-0 font-semibold text-navy">{{ t(d.label) }}</dt>
              <dd class="text-slate-700">{{ d.entries.filter((e) => e.kind === 'MASS' || e.kind === 'CONFESSION').map((e) => hm(e.time) + (e.kind === 'CONFESSION' ? ' (confessions)' : '')).join(' · ') }}</dd>
            </div>
          </dl>
          <p v-else class="mt-4 text-slate-600">{{ t(`Horaires bientôt disponibles.`) }}</p>
          <NuxtLink :to="lp('/horaires')" class="link-arrow mt-auto pt-5 text-sm">{{ t(`Tous les horaires`) }} <Icon name="arrow" /></NuxtLink>
        </article>

        <article class="card flex flex-col p-6">
          <h3 class="flex items-center gap-2.5 font-serif text-xl font-bold text-navy"><Icon name="megaphone" class="text-gold-dark" />{{ t(`Annonces`) }}</h3>
          <ul v-if="anns?.items.length" class="mt-4 divide-y divide-slate-100">
            <li v-for="a in anns.items.slice(0, 3)" :key="a.id" class="py-3 first:pt-0">
              <p class="text-xs font-semibold uppercase tracking-wider text-gold-dark">{{ longDate(a.publishedAt) }}</p>
              <p class="mt-0.5 font-semibold leading-snug text-navy">{{ a.title }}</p>
              <p class="mt-1 text-sm text-slate-600">{{ excerptOf(a.content, 90) }}</p>
            </li>
          </ul>
          <p v-else class="mt-4 text-slate-600">{{ t(`Aucune annonce pour le moment.`) }}</p>
          <NuxtLink :to="lp('/actualites')" class="link-arrow mt-auto pt-5 text-sm">{{ t(`Toutes les annonces`) }} <Icon name="arrow" /></NuxtLink>
        </article>

        <article class="bg-pattern flex flex-col rounded-2xl bg-navy p-6 text-white shadow-card">
          <h3 class="flex items-center gap-2.5 font-serif text-xl font-bold"><Icon name="file" class="text-gold-light" />{{ t(`Bulletin paroissial`) }}</h3>
          <template v-if="buls?.items[0]">
            <p class="mt-4 font-serif text-2xl font-bold leading-snug text-gold-light">{{ buls.items[0].title }}</p>
            <p class="mt-2 text-white/80">{{ t(`Les annonces, les intentions et le mot de la semaine, à lire ou à imprimer.`) }}</p>
            <a v-if="buls.items[0].file" :href="buls.items[0].file.url" target="_blank" rel="noopener" class="btn btn-gold mt-6 self-start"><Icon name="download" />{{ t(`Télécharger (PDF)`) }}</a>
          </template>
          <p v-else class="mt-4 text-white/80">{{ t(`Aucun bulletin publié pour le moment.`) }}</p>
          <NuxtLink :to="lp('/bulletins')" class="mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-semibold text-gold-light hover:underline">{{ t(`Bulletins précédents`) }} <Icon name="arrow" /></NuxtLink>
        </article>
      </div>
    </section>

    <!-- Messe en direct : visible seulement si un lien est renseigné dans Administration › Paramètres du site -->
    <section v-if="s['live.url']" class="bg-navy text-white">
      <div class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-5">
        <p class="flex items-center gap-3"><span class="inline-block h-3 w-3 animate-pulse rounded-full bg-red-500" aria-hidden="true" /><span class="font-serif text-xl font-semibold">{{ t(`Messe en direct`) }}</span><span v-if="s['live.label']" class="text-white/80">{{ s['live.label'] }}</span></p>
        <NuxtLink :to="lp('/direct')" class="btn btn-sm btn-gold"><Icon name="play" />{{ t(`Suivre la messe`) }}</NuxtLink>
      </div>
    </section>

    <!-- Mot du curé -->
    <section v-if="cure" class="bg-cream-dark">
      <div class="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-5 md:py-20">
        <div class="relative mx-auto w-full max-w-xs md:col-span-2">
          <div class="absolute -left-3 -top-3 h-full w-full rounded-2xl border-2 border-gold" aria-hidden="true" />
          <div class="bg-pattern relative flex aspect-[4/5] flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-navy to-navy-deep p-8 text-center text-white shadow-lift">
            <img :src="PLACEHOLDERS.emblem" alt="" width="96" height="96" class="h-24 w-24" loading="lazy" />
            <p class="mt-6 font-serif text-2xl font-bold italic leading-snug text-gold-light">{{ t(`« Je suis la lumière du monde »`) }}</p>
            <p class="mt-2 text-sm uppercase tracking-widest text-white/75">{{ t(`Jean 8, 12`) }}</p>
          </div>
        </div>
        <div class="md:col-span-3">
          <SectionTitle :eyebrow="t(`Bienvenue`)" :title="cure.title" align="left" />
          <p v-if="cure.excerpt" class="mt-6 font-serif text-2xl italic leading-relaxed text-navy">« {{ cure.excerpt }} »</p>
          <p class="mt-5 text-lg text-slate-700">{{ t(`Que vous veniez depuis toujours ou pour la première fois, notre paroisse vous ouvre ses portes : pour prier, célébrer, vous former et servir.`) }}</p>
          <div class="mt-7 flex flex-wrap gap-3">
            <NuxtLink :to="lp('/p/mot-du-cure')" class="btn btn-navy">{{ t(`Lire le message`) }} <Icon name="arrow" /></NuxtLink>
            <NuxtLink :to="lp('/personnel')" class="btn btn-outline">{{ t(`L'équipe pastorale`) }}</NuxtLink>
          </div>
        </div>
      </div>
    </section>

    <!-- Prochains événements -->
    <section v-if="evs?.items.length" class="mx-auto max-w-6xl px-4 py-16 md:py-20">
      <SectionTitle :eyebrow="t(`Agenda`)" :title="t(`Prochains événements`)" :text="t(`Célébrations, rencontres et temps forts : notez les dates.`)" />
      <ul class="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        <li v-for="e in evs.items.slice(0, 6)" :key="e.id">
          <NuxtLink :to="lp(`/agenda/${e.id}`)" class="card card-hover flex h-full gap-4 p-5">
            <DateBadge :date="e.startsAt" />
            <div class="min-w-0">
              <p v-if="e.category" class="text-xs font-semibold uppercase tracking-wider text-gold-dark">{{ t(e.category.name) }}</p>
              <p class="mt-0.5 font-serif text-lg font-bold leading-snug text-navy">{{ e.title }}</p>
              <p class="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-slate-600">
                <span class="flex items-center gap-1 capitalize"><Icon name="clock" />{{ dayLong(dayKey(e.startsAt)).split(' ')[0] }}<template v-if="!e.allDay"> · {{ timeLabel(e.startsAt) }}</template></span>
                <span v-if="e.location" class="flex items-center gap-1"><Icon name="pin" />{{ e.location }}</span>
              </p>
            </div>
          </NuxtLink>
        </li>
      </ul>
      <p class="mt-10 text-center"><NuxtLink :to="lp('/agenda')" class="btn btn-outline"><Icon name="calendar" />{{ t(`Voir tout l'agenda`) }}</NuxtLink></p>
    </section>

    <!-- Raccourcis -->
    <section class="bg-pattern bg-gradient-to-br from-navy-deep via-navy-dark to-navy py-16 md:py-20">
      <div class="mx-auto max-w-6xl px-4">
        <SectionTitle :eyebrow="t(`Trouver sa place`)" :title="t(`Vivre sa foi, s'impliquer`)" light />
        <ul class="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <li v-for="tile in tiles" :key="tile.to">
            <NuxtLink :to="lp(tile.to)" class="group flex h-full items-start gap-4 rounded-2xl border border-white/15 bg-white/[0.06] p-6 transition duration-200 hover:-translate-y-1 hover:border-gold-light/60 hover:bg-white/[0.12]">
              <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gold-dark text-xl text-white transition group-hover:bg-gold"><Icon :name="tile.icon" /></span>
              <span>
                <span class="block font-serif text-xl font-bold text-white">{{ t(tile.title) }}</span>
                <span class="mt-1 block text-white/80">{{ t(tile.text) }}</span>
              </span>
            </NuxtLink>
          </li>
        </ul>
      </div>
    </section>

    <!-- Campagne de dons en cours -->
    <section v-if="campaign" class="mx-auto max-w-6xl px-4 py-16 md:py-20">
      <div class="card grid overflow-hidden md:grid-cols-5">
        <div class="bg-cream-dark p-8 md:col-span-3 md:p-10">
          <p class="eyebrow">{{ t(`Projet soutenu par vos dons`) }}</p>
          <h2 class="mt-2 font-serif text-3xl font-bold leading-tight text-navy">{{ campaign.title }}</h2>
          <p v-if="campaign.description" class="mt-4 text-lg text-slate-700">{{ campaign.description }}</p>
        </div>
        <div class="flex flex-col justify-center p-8 md:col-span-2 md:p-10">
          <template v-if="campaign.goalAmount">
            <p class="font-serif text-4xl font-bold text-navy">{{ campaign.percent }} %</p>
            <div class="mt-3 h-3 overflow-hidden rounded-full bg-cream-dark" role="progressbar" :aria-valuenow="campaign.percent ?? 0" aria-valuemin="0" aria-valuemax="100" :aria-label="t(`Progression de la collecte : {titre}`, { titre: campaign.title })">
              <div class="h-full rounded-full bg-gradient-to-r from-gold-dark to-gold" :style="{ width: `${campaign.percent ?? 0}%` }" />
            </div>
            <p class="mt-3 text-slate-700"><strong class="text-navy">{{ formatAmount(campaign.raised, 'XOF') }}</strong> {{ t(`réunis sur`) }} {{ formatAmount(campaign.goalAmount, 'XOF') }}</p>
            <p class="text-sm text-slate-600">{{ campaign.donors }} {{ t(`don`) }}{{ campaign.donors > 1 ? 's' : '' }} {{ t(`à ce jour`) }}</p>
          </template>
          <NuxtLink :to="{ path: lp('/dons'), query: { campagne: campaign.slug } }" class="btn btn-gold mt-6 self-start"><Icon name="heart" />{{ t(`Soutenir ce projet`) }}</NuxtLink>
        </div>
      </div>
    </section>

    <!-- Homélies récentes -->
    <section v-if="homs?.items.length" class="bg-cream-dark py-16 md:py-20">
      <div class="mx-auto max-w-6xl px-4">
        <SectionTitle :eyebrow="t(`La Parole`)" :title="t(`Dernières homélies`)" />
        <ul class="mt-10 grid gap-5 md:grid-cols-3">
          <li v-for="h in homs.items" :key="h.id">
            <NuxtLink :to="lp(`/homelies/${h.id}`)" class="card card-hover flex h-full flex-col p-6">
              <span class="font-serif text-5xl leading-none text-gold" aria-hidden="true">“</span>
              <p class="-mt-2 font-serif text-xl font-bold leading-snug text-navy">{{ h.title }}</p>
              <p class="mt-auto pt-5 text-sm text-slate-600"><span class="font-semibold uppercase tracking-wider text-gold-dark">{{ longDate(h.date) }}</span><span v-if="h.preacher" class="block">{{ h.preacher }}</span></p>
            </NuxtLink>
          </li>
        </ul>
        <p class="mt-10 text-center"><NuxtLink :to="lp('/homelies')" class="btn btn-outline"><Icon name="book" />{{ t(`Toutes les homélies`) }}</NuxtLink></p>
      </div>
    </section>

    <!-- Galerie -->
    <section v-if="albs?.items.length" class="mx-auto max-w-6xl px-4 pt-16 md:pt-20">
      <SectionTitle :eyebrow="t(`En images`)" :title="t(`La paroisse en photos`)" />
      <ul class="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <li v-for="a in albs.items.slice(0, 3)" :key="a.slug">
          <NuxtLink :to="lp(`/galerie/${a.slug}`)" class="group relative block overflow-hidden rounded-2xl shadow-card">
            <img :src="a.cover?.thumbUrl || a.cover?.url || PLACEHOLDERS.photo" :alt="t(`Album : {titre}`, { titre: a.title })" class="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" />
            <span class="absolute inset-0 bg-gradient-to-t from-navy-deep/90 via-navy-deep/20 to-transparent" aria-hidden="true" />
            <span class="absolute inset-x-0 bottom-0 p-5 text-white">
              <span class="block font-serif text-xl font-bold">{{ a.title }}</span>
              <span class="mt-1 flex items-center gap-1.5 text-sm text-white/85"><Icon name="image" />{{ a.count }} {{ t(`photo`) }}{{ a.count > 1 ? 's' : '' }}<template v-if="a.date"> · {{ longDate(a.date) }}</template></span>
            </span>
          </NuxtLink>
        </li>
      </ul>
      <p class="mt-10 text-center"><NuxtLink :to="lp('/galerie')" class="btn btn-outline"><Icon name="image" />{{ t(`Toute la galerie`) }}</NuxtLink></p>
    </section>
  </div>
</template>
