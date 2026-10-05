<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: ['admin', 'admin-staff'] });
useHead({ title: 'Don – Administration', meta: [{ name: 'robots', content: 'noindex' }] });

const id = Number(useRoute().params.id);
type D = { id: number; reference: string; amount: number; currency: string; status: string; methodLabel: string; provider: string; donorName: string | null; donorEmail: string | null; donorPhone: string | null; message: string | null; note: string | null; campaign: string | null; paidAt: string | null; createdAt: string };
const { data, error, refresh } = await useAdminFetch<{ item: D }>(`/api/admin/donations/${id}`);
if (error.value || !data.value) throw createError({ statusCode: 404, statusMessage: 'Don introuvable' });
const d = computed(() => data.value!.item);
const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' }) : '—');

const err = ref('');
async function recheck() {
  err.value = '';
  try {
    await $fetch(`/api/admin/donations/${id}/recheck`, { method: 'POST' });
    await refresh();
  } catch (e) {
    err.value = apiError(e);
  }
}
</script>

<template>
  <div class="max-w-2xl">
    <NuxtLink to="/admin/donations" class="text-sm text-navy underline">← Dons reçus</NuxtLink>
    <h1 class="mt-1 text-2xl font-bold text-navy">Don de {{ formatAmount(d.amount, d.currency) }}</h1>
    <p class="mt-1"><span :class="['rounded-full px-2 py-0.5 text-xs', DONATION_STATUS[d.status]?.cls]">{{ DONATION_STATUS[d.status]?.label }}</span></p>

    <dl class="mt-5 grid gap-4 rounded-xl bg-white p-6 shadow sm:grid-cols-2">
      <div><dt class="text-xs font-semibold uppercase tracking-wide text-gold">Référence</dt><dd class="mt-0.5 break-all font-mono text-sm">{{ d.reference }}</dd></div>
      <div><dt class="text-xs font-semibold uppercase tracking-wide text-gold">Moyen de paiement</dt><dd class="mt-0.5">{{ d.methodLabel }} <span class="text-xs text-slate-500">({{ d.provider }})</span></dd></div>
      <div><dt class="text-xs font-semibold uppercase tracking-wide text-gold">Créé le</dt><dd class="mt-0.5">{{ fmt(d.createdAt) }}</dd></div>
      <div><dt class="text-xs font-semibold uppercase tracking-wide text-gold">Payé le</dt><dd class="mt-0.5">{{ fmt(d.paidAt) }}</dd></div>
      <div><dt class="text-xs font-semibold uppercase tracking-wide text-gold">Donateur</dt><dd class="mt-0.5">{{ d.donorName || '—' }}</dd></div>
      <div><dt class="text-xs font-semibold uppercase tracking-wide text-gold">Campagne</dt><dd class="mt-0.5">{{ d.campaign || 'Don libre' }}</dd></div>
      <div><dt class="text-xs font-semibold uppercase tracking-wide text-gold">E-mail</dt><dd class="mt-0.5"><a v-if="d.donorEmail" :href="`mailto:${d.donorEmail}`" class="text-navy underline">{{ d.donorEmail }}</a><span v-else>—</span></dd></div>
      <div><dt class="text-xs font-semibold uppercase tracking-wide text-gold">Téléphone</dt><dd class="mt-0.5">{{ d.donorPhone || '—' }}</dd></div>
      <div v-if="d.message" class="sm:col-span-2"><dt class="text-xs font-semibold uppercase tracking-wide text-gold">Message</dt><dd class="mt-0.5 whitespace-pre-line">{{ d.message }}</dd></div>
      <div v-if="d.note" class="sm:col-span-2"><dt class="text-xs font-semibold uppercase tracking-wide text-red-700">Note / anomalie</dt><dd class="mt-0.5 text-red-800">{{ d.note }}</dd></div>
    </dl>

    <p v-if="err" class="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{{ err }}</p>
    <button v-if="d.status === 'PENDING'" class="mt-5 rounded bg-navy px-4 py-2 text-sm text-white" @click="recheck">Revérifier auprès du prestataire</button>
  </div>
</template>
