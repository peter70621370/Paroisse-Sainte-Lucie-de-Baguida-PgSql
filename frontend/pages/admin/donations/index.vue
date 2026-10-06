<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: ['admin', 'admin-staff'] });
useHead({ title: 'Dons – Administration', meta: [{ name: 'robots', content: 'noindex' }] });

type D = { id: number; reference: string; amount: number; currency: string; status: string; methodLabel: string; donorName: string | null; donorEmail: string | null; campaign: string | null; createdAt: string; note: string | null };

const page = ref(1);
const status = ref('SUCCEEDED');
const method = ref('');
const q = ref('');
const from = ref('');
const to = ref('');
const query = computed(() => ({ page: page.value, status: status.value || undefined, method: method.value || undefined, q: q.value || undefined, from: from.value || undefined, to: to.value || undefined }));

const { data, refresh } = await useAdminFetch<{ items: D[]; total: number; pageSize: number }>('/api/admin/donations', { query, watch: [query] });
const { data: summary, refresh: refreshSummary } = await useAdminFetch<{ byCurrency: Record<string, { count: number; total: number }>; totalXof: number; count: number; pending: number; stalePending: number }>('/api/admin/donations/summary');
const pages = computed(() => Math.max(1, Math.ceil((data.value?.total ?? 0) / (data.value?.pageSize ?? 25))));

const exportUrl = computed(() => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(query.value)) if (v && k !== 'page') p.set(k, String(v));
  return `/api/admin/donations/export.csv?${p}`;
});
const fmt = (iso: string) => new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });

const err = ref('');
async function recheck(d: D) {
  err.value = '';
  try {
    await $fetch(`/api/admin/donations/${d.id}/recheck`, { method: 'POST' });
    await Promise.all([refresh(), refreshSummary()]);
  } catch (e) {
    err.value = apiError(e);
  }
}
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-2xl font-bold text-navy">Dons reçus</h1>
      <a :href="exportUrl" download class="rounded border border-navy px-4 py-2 text-sm text-navy hover:bg-navy hover:text-white">Exporter en CSV</a>
    </div>

    <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div class="rounded-xl bg-white p-4 shadow"><p class="text-xs text-slate-600">Total encaissé (équivalent FCFA)</p><p class="mt-1 font-serif text-2xl font-bold text-navy">{{ formatAmount(summary?.totalXof ?? 0, 'XOF') }}</p></div>
      <div class="rounded-xl bg-white p-4 shadow"><p class="text-xs text-slate-600">Dons réussis</p><p class="mt-1 font-serif text-2xl font-bold text-navy">{{ summary?.count ?? 0 }}</p></div>
      <div class="rounded-xl bg-white p-4 shadow">
        <p class="text-xs text-slate-600">Détail par devise</p>
        <p class="mt-1 text-sm">FCFA : <strong>{{ formatAmount(summary?.byCurrency?.XOF?.total ?? 0, 'XOF') }}</strong></p>
        <p class="text-sm">Euros (PayPal) : <strong>{{ formatAmount(summary?.byCurrency?.EUR?.total ?? 0, 'EUR') }}</strong></p>
      </div>
      <div :class="['rounded-xl p-4 shadow', summary?.stalePending ? 'bg-amber-50' : 'bg-white']">
        <p class="text-xs text-slate-600">En attente</p>
        <p class="mt-1 font-serif text-2xl font-bold text-navy">{{ summary?.pending ?? 0 }}</p>
        <p v-if="summary?.stalePending" class="text-xs text-amber-800">dont {{ summary.stalePending }} depuis plus d'1 h : à revérifier</p>
      </div>
    </div>

    <div class="mt-5 flex flex-wrap gap-3">
      <select v-model="status" class="rounded border border-slate-300 px-3 py-2 text-sm" @change="page = 1">
        <option value="">Tous les statuts</option><option value="SUCCEEDED">Réussis</option><option value="PENDING">En attente</option><option value="FAILED">Échoués</option><option value="CANCELLED">Annulés</option>
      </select>
      <select v-model="method" class="rounded border border-slate-300 px-3 py-2 text-sm" @change="page = 1">
        <option value="">Tous les moyens</option><option value="MOBILE_MONEY">Mobile Money</option><option value="CARD">Carte bancaire</option><option value="PAYPAL">PayPal</option>
      </select>
      <label class="flex items-center gap-1 text-sm">Du <input v-model="from" type="date" class="rounded border border-slate-300 px-2 py-1.5" @change="page = 1" /></label>
      <label class="flex items-center gap-1 text-sm">au <input v-model="to" type="date" class="rounded border border-slate-300 px-2 py-1.5" @change="page = 1" /></label>
      <input v-model.lazy="q" placeholder="Nom, e-mail, référence…" class="rounded border border-slate-300 px-3 py-2 text-sm" @change="page = 1" />
    </div>

    <p v-if="err" class="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{{ err }}</p>

    <div class="mt-4 overflow-x-auto rounded-xl bg-white shadow">
      <table class="w-full text-left text-sm">
        <thead class="border-b bg-slate-50 text-slate-600">
          <tr><th class="px-4 py-3">Date</th><th class="px-4 py-3">Montant</th><th class="px-4 py-3">Moyen</th><th class="px-4 py-3">Donateur</th><th class="px-4 py-3">Campagne</th><th class="px-4 py-3">Statut</th><th class="px-4 py-3"></th></tr>
        </thead>
        <tbody>
          <tr v-for="d in data?.items" :key="d.id" class="border-b last:border-0">
            <td class="whitespace-nowrap px-4 py-3">{{ fmt(d.createdAt) }}</td>
            <td class="whitespace-nowrap px-4 py-3 font-semibold">{{ formatAmount(d.amount, d.currency) }}</td>
            <td class="px-4 py-3">{{ d.methodLabel }}</td>
            <td class="px-4 py-3">{{ d.donorName || '—' }}<span v-if="d.donorEmail" class="block text-xs text-slate-600">{{ d.donorEmail }}</span></td>
            <td class="px-4 py-3 text-slate-600">{{ d.campaign }}</td>
            <td class="px-4 py-3">
              <span :class="['rounded-full px-2 py-0.5 text-xs', DONATION_STATUS[d.status]?.cls]">{{ DONATION_STATUS[d.status]?.label }}</span>
              <span v-if="d.note" class="mt-1 block text-xs text-red-700">{{ d.note }}</span>
            </td>
            <td class="whitespace-nowrap px-4 py-3 text-right">
              <button v-if="d.status === 'PENDING'" class="mr-3 text-navy underline" @click="recheck(d)">Revérifier</button>
              <NuxtLink :to="`/admin/donations/${d.id}`" class="text-navy underline">Détail</NuxtLink>
            </td>
          </tr>
          <tr v-if="!data?.items.length"><td colspan="7" class="px-4 py-6 text-center text-slate-600">Aucun don.</td></tr>
        </tbody>
      </table>
    </div>

    <div v-if="pages > 1" class="mt-4 flex items-center gap-3 text-sm">
      <button class="rounded border px-3 py-1 disabled:opacity-40" :disabled="page <= 1" @click="page--">Précédent</button>
      <span>Page {{ page }} / {{ pages }}</span>
      <button class="rounded border px-3 py-1 disabled:opacity-40" :disabled="page >= pages" @click="page++">Suivant</button>
    </div>
  </div>
</template>
