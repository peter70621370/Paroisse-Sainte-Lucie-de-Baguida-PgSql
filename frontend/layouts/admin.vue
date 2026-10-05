<script setup lang="ts">
const { user, logout } = useAuth();
const route = useRoute();
const open = ref(false);

const canSeeRequests = computed(() => user.value?.role !== 'CONTRIBUTOR');
const { data: summary } = useAdminFetch<{ new: number }>('/api/admin/submissions/summary', { key: 'submissions-summary', immediate: canSeeRequests.value, server: false });

const links = computed(() => [
  { to: '/admin', label: 'Tableau de bord' },
  ...(canSeeRequests.value ? [{ section: 'Demandes' }, { to: '/admin/submissions', label: 'Demandes reçues', badge: summary.value?.new }, { to: '/admin/donations', label: 'Dons reçus' }] : []),
  { section: 'Contenus' },
  { to: '/admin/pages', label: 'Pages' },
  { to: '/admin/announcements', label: 'Annonces' },
  { to: '/admin/bulletins', label: 'Bulletins' },
  { to: '/admin/schedules', label: 'Horaires des messes' },
  { to: '/admin/staff', label: 'Personnel pastoral' },
  { to: '/admin/events', label: 'Agenda' },
  { to: '/admin/campaigns', label: 'Campagnes de dons' },
  { to: '/admin/homilies', label: 'Homélies' },
  { to: '/admin/media', label: 'Médiathèque' },
  { section: 'Réglages' },
  { to: '/admin/settings', label: 'Paramètres du site' },
  ...(user.value?.role === 'ADMIN' ? [{ to: '/admin/users', label: 'Utilisateurs' }] : []),
  { to: '/admin/profile', label: 'Mon compte' },
]);
const isActive = (to: string) => (to === '/admin' ? route.path === '/admin' : route.path.startsWith(to));
watch(() => route.path, () => (open.value = false));
</script>

<template>
  <div class="min-h-screen md:flex">
    <header class="flex items-center justify-between bg-[#1F3A5F] px-4 py-3 text-white md:hidden">
      <span class="font-semibold">Administration</span>
      <button class="rounded border border-white/40 px-3 py-1 text-sm" @click="open = !open">Menu</button>
    </header>

    <aside :class="[open ? 'block' : 'hidden', 'bg-[#1F3A5F] text-white md:block md:w-60 md:shrink-0']">
      <div class="hidden px-5 py-5 md:block">
        <p class="text-xs uppercase tracking-wide text-white/60">Paroisse Sainte Lucie</p>
        <p class="font-semibold">Administration</p>
      </div>
      <nav class="flex flex-col px-2 pb-3 md:pb-0">
        <template v-for="l in links" :key="l.to ?? l.section">
          <p v-if="'section' in l" class="mt-3 px-3 pb-1 text-xs uppercase tracking-wide text-white/50">{{ l.section }}</p>
          <NuxtLink
            v-else
            :to="l.to"
            :class="['rounded px-3 py-2 text-sm', isActive(l.to) ? 'bg-white/15 font-medium' : 'hover:bg-white/10']"
          >
            {{ l.label }}
            <span v-if="'badge' in l && l.badge" class="ml-2 rounded-full bg-gold px-2 py-0.5 text-xs font-semibold text-white">{{ l.badge }}</span>
          </NuxtLink>
        </template>
      </nav>
      <div class="mt-4 border-t border-white/15 px-5 py-4 text-sm">
        <p class="truncate">{{ user?.firstName }} {{ user?.lastName }}</p>
        <button class="mt-2 text-white/80 underline" @click="logout">Se déconnecter</button>
      </div>
    </aside>

    <main class="min-w-0 flex-1 px-4 py-6 md:px-8">
      <slot />
    </main>
  </div>
</template>
