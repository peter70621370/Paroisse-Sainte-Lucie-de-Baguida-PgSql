<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: ['admin', 'admin-staff'] });
useHead({ title: 'Demandes reçues – Administration', meta: [{ name: 'robots', content: 'noindex' }] });

type S = { id: number; type: string; typeLabel: string; status: 'NEW' | 'PROCESSED' | 'ARCHIVED'; fullName: string | null; email: string | null; phone: string | null; createdAt: string };

const page = ref(1);
const type = ref('');
const status = ref('NEW');
const q = ref('');
const query = computed(() => ({ page: page.value, type: type.value || undefined, status: status.value || undefined, q: q.value || undefined }));
const { data, refresh } = await useAdminFetch<{ items: S[]; total: number; pageSize: number }>('/api/admin/submissions', { query, watch: [query] });
const pages = computed(() => Math.max(1, Math.ceil((data.value?.total ?? 0) / (data.value?.pageSize ?? 25))));

const types = [
  ['CONTACT', 'Messages de contact'], ['MEMBERSHIP', 'Adhésions'], ['CATECHISM', 'Catéchisme'], ['SACRAMENT', 'Sacrements'], ['MASS_INTENTION', 'Intentions de messe'],
];
const statusLabel = { NEW: 'Nouvelle', PROCESSED: 'Traitée', ARCHIVED: 'Archivée' } as const;
const statusCls = { NEW: 'bg-amber-100 text-amber-800', PROCESSED: 'bg-green-100 text-green-800', ARCHIVED: 'bg-slate-200 text-slate-700' } as const;
const fmt = (iso: string) => new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
const exportUrl = computed(() => {
  const p = new URLSearchParams();
  if (type.value) p.set('type', type.value);
  if (status.value) p.set('status', status.value);
  return `/api/admin/submissions/export.csv?${p}`;
});

const err = ref('');
async function mark(s: S, to: S['status']) {
  err.value = '';
  try {
    await $fetch(`/api/admin/submissions/${s.id}`, { method: 'PATCH', body: { status: to } });
    await refresh();
    await refreshNuxtData('submissions-summary');
  } catch (e) {
    err.value = apiError(e);
  }
}
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="font-serif text-3xl font-bold text-navy">Demandes reçues</h1>
      <a :href="exportUrl" class="btn btn-sm btn-outline" download>Exporter en CSV</a>
    </div>
    <p class="mt-1 text-sm text-slate-600">Messages, adhésions, inscriptions, demandes de sacrements et intentions de messe envoyés depuis le site. Données personnelles : à traiter avec discrétion.</p>

    <div class="mt-4 flex flex-wrap gap-3">
      <select v-model="status" class="field !w-auto text-sm" @change="page = 1">
        <option value="">Tous les statuts</option>
        <option value="NEW">Nouvelles</option>
        <option value="PROCESSED">Traitées</option>
        <option value="ARCHIVED">Archivées</option>
      </select>
      <select v-model="type" class="field !w-auto text-sm" @change="page = 1">
        <option value="">Tous les types</option>
        <option v-for="[v, l] in types" :key="v" :value="v">{{ l }}</option>
      </select>
      <input v-model.lazy="q" placeholder="Nom, e-mail, téléphone…" class="field !w-auto text-sm" @change="page = 1" />
    </div>

    <p v-if="err" class="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700" role="alert">{{ err }}</p>

    <div class="mt-4 card overflow-x-auto">
      <table class="w-full text-left text-sm">
        <thead class="border-b border-gold/20 bg-cream-dark/60 text-xs uppercase tracking-wider text-slate-600">
          <tr><th class="px-4 py-3">Reçue le</th><th class="px-4 py-3">Type</th><th class="px-4 py-3">Nom</th><th class="px-4 py-3">Contact</th><th class="px-4 py-3">Statut</th><th class="px-4 py-3"></th></tr>
        </thead>
        <tbody>
          <tr v-for="s in data?.items" :key="s.id" class="border-b border-slate-100 transition last:border-0 hover:bg-cream/60">
            <td class="whitespace-nowrap px-4 py-3">{{ fmt(s.createdAt) }}</td>
            <td class="px-4 py-3">{{ s.typeLabel }}</td>
            <td class="px-4 py-3 font-medium"><NuxtLink :to="`/admin/submissions/${s.id}`" class="text-navy hover:underline">{{ s.fullName }}</NuxtLink></td>
            <td class="px-4 py-3 text-slate-600">{{ s.phone }}<span v-if="s.phone && s.email"> · </span>{{ s.email }}</td>
            <td class="px-4 py-3"><span :class="['rounded-full px-2 py-0.5 text-xs', statusCls[s.status]]">{{ statusLabel[s.status] }}</span></td>
            <td class="whitespace-nowrap px-4 py-3 text-right">
              <NuxtLink :to="`/admin/submissions/${s.id}`" class="mr-3 text-navy underline">Ouvrir</NuxtLink>
              <button v-if="s.status === 'NEW'" class="text-green-800 underline" @click="mark(s, 'PROCESSED')">Marquer traitée</button>
            </td>
          </tr>
          <tr v-if="!data?.items.length"><td colspan="6" class="px-4 py-6 text-center text-slate-600">Aucune demande.</td></tr>
        </tbody>
      </table>
    </div>

    <div v-if="pages > 1" class="mt-4 flex items-center gap-3 text-sm">
      <button class="btn btn-sm btn-outline disabled:opacity-40" :disabled="page <= 1" @click="page--">Précédent</button>
      <span>Page {{ page }} / {{ pages }}</span>
      <button class="btn btn-sm btn-outline disabled:opacity-40" :disabled="page >= pages" @click="page++">Suivant</button>
    </div>
  </div>
</template>
