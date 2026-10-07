<script setup lang="ts">
import type { IconName } from '~/components/Icon.vue';

const { user, logout } = useAuth();
const route = useRoute();
const open = ref(false);

const canSeeRequests = computed(() => user.value?.role !== 'CONTRIBUTOR');
const { data: summary } = useAdminFetch<{ new: number }>('/api/admin/submissions/summary', { key: 'submissions-summary', immediate: canSeeRequests.value, server: false });

type Link = { to: string; label: string; icon: IconName; badge?: number };
type Entry = Link | { section: string };
const links = computed<Entry[]>(() => [
  { to: '/admin', label: 'Tableau de bord', icon: 'home' },
  ...(canSeeRequests.value
    ? ([
        { section: 'Demandes' },
        { to: '/admin/submissions', label: 'Demandes reçues', icon: 'mail', badge: summary.value?.new },
        { to: '/admin/donations', label: 'Dons reçus', icon: 'heart' },
        { to: '/admin/newsletter', label: 'Newsletter', icon: 'megaphone' },
        { to: '/admin/stats', label: 'Statistiques', icon: 'chart' },
      ] satisfies Entry[])
    : []),
  { section: 'Contenus' },
  { to: '/admin/pages', label: 'Pages', icon: 'file' },
  { to: '/admin/announcements', label: 'Annonces', icon: 'megaphone' },
  { to: '/admin/bulletins', label: 'Bulletins', icon: 'download' },
  { to: '/admin/schedules', label: 'Horaires des messes', icon: 'clock' },
  { to: '/admin/staff', label: 'Personnel pastoral', icon: 'users' },
  { to: '/admin/events', label: 'Agenda', icon: 'calendar' },
  { to: '/admin/albums', label: 'Galerie', icon: 'image' },
  { to: '/admin/campaigns', label: 'Campagnes de dons', icon: 'gift' },
  { to: '/admin/homilies', label: 'Homélies', icon: 'book' },
  { to: '/admin/media', label: 'Médiathèque', icon: 'folder' },
  { section: 'Réglages' },
  { to: '/admin/settings', label: 'Paramètres du site', icon: 'settings' },
  ...(user.value?.role === 'ADMIN' ? ([{ to: '/admin/users', label: 'Utilisateurs', icon: 'users' }] satisfies Entry[]) : []),
  { to: '/admin/profile', label: 'Mon compte', icon: 'user' },
]);
const isActive = (to: string) => (to === '/admin' ? route.path === '/admin' : route.path.startsWith(to));
watch(() => route.path, () => (open.value = false));

const roleLabel = { ADMIN: 'Administrateur', EDITOR: 'Éditeur', CONTRIBUTOR: 'Contributeur' } as const;
const initials = computed(() => `${user.value?.firstName?.[0] ?? ''}${user.value?.lastName?.[0] ?? ''}`.toUpperCase());
</script>

<template>
  <div class="admin min-h-screen bg-[#F4F1E8] lg:flex">
    <header class="flex items-center justify-between bg-navy-deep px-4 py-3 text-white lg:hidden">
      <span class="flex items-center gap-2.5 font-serif text-lg font-bold"><img :src="PLACEHOLDERS.emblem" alt="" class="h-8 w-8" />Administration</span>
      <button class="flex items-center gap-2 rounded-full border border-white/40 px-4 py-1.5 text-sm font-semibold" :aria-expanded="open" @click="open = !open"><Icon :name="open ? 'close' : 'menu'" />Menu</button>
    </header>

    <aside :class="[open ? 'block' : 'hidden', 'bg-navy-deep text-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-64 lg:shrink-0 lg:flex-col']">
      <div class="hidden items-center gap-3 border-b border-white/10 px-5 py-5 lg:flex">
        <img :src="PLACEHOLDERS.emblem" alt="" class="h-11 w-11" />
        <div class="leading-tight">
          <p class="text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-gold-light">Sainte Lucie</p>
          <p class="font-serif text-lg font-bold">Administration</p>
        </div>
      </div>
      <nav class="admin-nav flex flex-col gap-0.5 px-3 py-3 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pb-6">
        <template v-for="l in links" :key="'to' in l ? l.to : l.section">
          <p v-if="'section' in l" class="mt-4 px-3 pb-1 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-white/55">{{ l.section }}</p>
          <NuxtLink
            v-else
            :to="l.to"
            :class="['flex items-center gap-3 rounded-lg px-3 py-2 text-[0.93rem] transition', isActive(l.to) ? 'bg-gold-dark font-semibold text-white shadow-sm' : 'text-white/85 hover:bg-white/10 hover:text-white']"
          >
            <Icon :name="l.icon" :class="isActive(l.to) ? '' : 'text-gold-light'" />
            <span class="flex-1">{{ l.label }}</span>
            <span v-if="l.badge" :class="['rounded-full px-2 py-0.5 text-xs font-bold', isActive(l.to) ? 'bg-white text-gold-deep' : 'bg-gold-dark text-white']">{{ l.badge }}</span>
          </NuxtLink>
        </template>

        <!-- Compte connecté : tout en bas du menu, à la suite des rubriques (défile avec elles) -->
        <div class="mt-5 border-t border-white/10 px-1 pt-4">
          <div class="flex items-center gap-3">
            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 font-serif font-bold text-gold-light" aria-hidden="true">{{ initials }}</span>
            <div class="min-w-0 leading-tight">
              <p class="truncate text-sm font-semibold">{{ user?.firstName }} {{ user?.lastName }}</p>
              <p class="text-xs text-white/65">{{ user && roleLabel[user.role] }}</p>
            </div>
          </div>
          <div class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <a href="/" target="_blank" rel="noopener" class="flex items-center gap-1.5 text-white/85 hover:text-gold-light"><Icon name="external" />Voir le site</a>
            <button class="flex items-center gap-1.5 text-white/85 hover:text-gold-light" @click="logout"><Icon name="logout" />Se déconnecter</button>
          </div>
        </div>
      </nav>
    </aside>

    <main class="min-w-0 flex-1 px-4 py-7 md:px-8 lg:px-10 lg:py-9">
      <slot />
    </main>
  </div>
</template>
