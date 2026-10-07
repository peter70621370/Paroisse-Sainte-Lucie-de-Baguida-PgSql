<script setup lang="ts">
import type { IconName } from '~/components/Icon.vue';

definePageMeta({ layout: 'admin', middleware: 'admin' });
useHead({ title: 'Administration', meta: [{ name: 'robots', content: 'noindex' }] });

const { user } = useAuth();
const canSeeRequests = computed(() => user.value?.role !== 'CONTRIBUTOR');
const opts = { immediate: canSeeRequests.value, server: false };
const { data: summary } = useAdminFetch<{ new: number; byType: Record<string, number> }>('/api/admin/submissions/summary', { key: 'submissions-summary', ...opts });
const { data: gifts } = useAdminFetch<{ totalXof: number; count: number; pending: number }>('/api/admin/donations/summary', { key: 'dash-donations', ...opts });
const { data: stats } = useAdminFetch<{ totals: { views: number; visitors: number } }>('/api/admin/analytics', { key: 'dash-stats', query: { days: 30 }, ...opts });
const { data: subs } = useAdminFetch<{ confirmed: number }>('/api/admin/subscribers/summary', { key: 'dash-news', ...opts, onResponseError: () => {} });

const roleLabel = { ADMIN: 'Administrateur', EDITOR: 'Éditeur', CONTRIBUTOR: 'Contributeur' } as const;
const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

const shortcuts: { to: string; title: string; text: string; icon: IconName }[] = [
  { to: '/admin/announcements/new', title: 'Publier une annonce', text: 'Elle apparaît sur l\'accueil et la page Annonces', icon: 'megaphone' },
  { to: '/admin/bulletins', title: 'Ajouter le bulletin', text: 'Téléverser le PDF de la semaine', icon: 'download' },
  { to: '/admin/events/new', title: 'Ajouter un événement', text: 'Célébration, réunion, temps fort', icon: 'calendar' },
  { to: '/admin/homilies/new', title: 'Publier une homélie', text: 'Texte, audio ou vidéo', icon: 'book' },
  { to: '/admin/albums/new', title: 'Créer un album photo', text: 'Photos et vidéos d\'un événement', icon: 'image' },
  { to: '/admin/schedules', title: 'Modifier les horaires', text: 'Messes, confessions, adoration', icon: 'clock' },
];
</script>

<template>
  <div class="max-w-6xl">
    <p class="text-sm capitalize text-slate-600">{{ today }}</p>
    <h1 class="font-serif text-3xl font-bold text-navy">Tableau de bord</h1>
    <p class="mt-2 text-slate-700">
      Bonjour <strong>{{ user?.firstName }} {{ user?.lastName }}</strong>
      <span class="ml-2 rounded-full bg-gold-light/60 px-2.5 py-0.5 text-xs font-semibold text-gold-deep">{{ user && roleLabel[user.role] }}</span>
    </p>

    <!-- Chiffres clés -->
    <div v-if="canSeeRequests" class="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <NuxtLink to="/admin/submissions" class="card card-hover flex items-start gap-4 p-5">
        <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-navy text-xl text-gold-light"><Icon name="mail" /></span>
        <span>
          <span class="block text-sm text-slate-600">Demandes reçues</span>
          <span class="block font-serif text-3xl font-bold text-navy">{{ summary?.new ?? 0 }}</span>
          <span class="block text-sm text-slate-600">nouvelle(s) à traiter</span>
        </span>
      </NuxtLink>
      <NuxtLink to="/admin/donations" class="card card-hover flex items-start gap-4 p-5">
        <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gold-dark text-xl text-white"><Icon name="heart" /></span>
        <span>
          <span class="block text-sm text-slate-600">Dons reçus</span>
          <span class="block font-serif text-xl font-bold leading-tight text-navy">{{ formatAmount(gifts?.totalXof ?? 0, 'XOF') }}</span>
          <span class="block text-sm text-slate-600">{{ gifts?.count ?? 0 }} don(s)<template v-if="gifts?.pending"> · {{ gifts.pending }} en attente</template></span>
        </span>
      </NuxtLink>
      <NuxtLink to="/admin/stats" class="card card-hover flex items-start gap-4 p-5">
        <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-navy text-xl text-gold-light"><Icon name="chart" /></span>
        <span>
          <span class="block text-sm text-slate-600">Visites (30 jours)</span>
          <span class="block font-serif text-3xl font-bold text-navy">{{ (stats?.totals.visitors ?? 0).toLocaleString('fr-FR') }}</span>
          <span class="block text-sm text-slate-600">{{ (stats?.totals.views ?? 0).toLocaleString('fr-FR') }} pages vues</span>
        </span>
      </NuxtLink>
      <NuxtLink to="/admin/newsletter" class="card card-hover flex items-start gap-4 p-5">
        <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gold-dark text-xl text-white"><Icon name="megaphone" /></span>
        <span>
          <span class="block text-sm text-slate-600">Newsletter</span>
          <span class="block font-serif text-3xl font-bold text-navy">{{ subs?.confirmed ?? 0 }}</span>
          <span class="block text-sm text-slate-600">abonné(s) confirmé(s)</span>
        </span>
      </NuxtLink>
    </div>

    <!-- Actions courantes -->
    <h2 class="mt-10 font-serif text-xl font-bold text-navy">Actions courantes</h2>
    <ul class="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <li v-for="s in shortcuts" :key="s.to">
        <NuxtLink :to="s.to" class="card card-hover group flex h-full items-center gap-4 p-5">
          <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cream-dark text-xl text-gold-dark transition group-hover:bg-navy group-hover:text-gold-light"><Icon :name="s.icon" /></span>
          <span class="min-w-0 flex-1">
            <span class="block font-semibold text-navy">{{ s.title }}</span>
            <span class="block text-sm text-slate-600">{{ s.text }}</span>
          </span>
          <Icon name="chevron-right" class="text-gold-dark" />
        </NuxtLink>
      </li>
    </ul>

    <div class="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-navy p-6 text-white">
      <div>
        <p class="font-serif text-xl font-bold">Identité et coordonnées du site</p>
        <p class="mt-1 text-white/85">Logo, photo d'accueil, texte de bienvenue, adresse, horaires du secrétariat, réseaux sociaux.</p>
      </div>
      <NuxtLink to="/admin/settings" class="btn btn-sm btn-gold"><Icon name="settings" />Paramètres du site</NuxtLink>
    </div>
  </div>
</template>
