<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' });
useHead({ title: 'Administration', meta: [{ name: 'robots', content: 'noindex' }] });

const { user } = useAuth();
const canSeeRequests = computed(() => user.value?.role !== 'CONTRIBUTOR');
const { data: summary } = useAdminFetch<{ new: number; byType: Record<string, number> }>('/api/admin/submissions/summary', { key: 'submissions-summary', immediate: canSeeRequests.value, server: false });
const roleLabel = { ADMIN: 'Administrateur', EDITOR: 'Éditeur', CONTRIBUTOR: 'Contributeur' } as const;
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-[#1F3A5F]">Tableau de bord</h1>
    <p class="mt-4">
      Bonjour <strong>{{ user?.firstName }} {{ user?.lastName }}</strong>
      <span class="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">{{ user && roleLabel[user.role] }}</span>
    </p>
    <NuxtLink v-if="canSeeRequests" to="/admin/submissions" class="mt-6 block max-w-md rounded-xl bg-white p-5 shadow hover:shadow-md">
      <p class="text-sm text-slate-500">Demandes reçues</p>
      <p class="mt-1 font-serif text-3xl font-bold text-navy">{{ summary?.new ?? 0 }} <span class="text-base font-normal text-slate-600">nouvelle(s) à traiter</span></p>
    </NuxtLink>
    <p class="mt-6 text-sm text-slate-500">Utilisez le menu pour gérer les pages, annonces, bulletins, horaires, agenda et homélies.</p>
  </div>
</template>
