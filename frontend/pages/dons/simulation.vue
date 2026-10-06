<script setup lang="ts">
// Page de paiement FICTIVE (PAYMENT_MODE=mock, développement uniquement). Remplace la page du prestataire.
definePageMeta({ layout: false });
useHead({ title: 'Simulation de paiement', meta: [{ name: 'robots', content: 'noindex' }] });

const reference = String(useRoute().query.ref ?? '');
const info = ref<{ amount: number; currency: string; method: string | null } | null>(null);
const error = ref('');
const busy = ref(false);

onMounted(async () => {
  try {
    info.value = await $fetch<{ amount: number; currency: string; method: string | null }>(`/api/donations/${reference}/confirm`, { method: 'POST' });
  } catch {
    error.value = 'Don introuvable.';
  }
});

async function choose(action: 'pay' | 'fail' | 'cancel') {
  busy.value = true;
  try {
    await $fetch(`/api/donations/mock/${reference}/${action}`, { method: 'POST' });
    await navigateTo({ path: '/dons/merci', query: { ref: reference, ...(action === 'cancel' ? { cancel: '1' } : {}) } });
  } catch {
    error.value = 'La simulation n\'est pas disponible (mode réel).';
    busy.value = false;
  }
}
</script>

<template>
  <main class="mx-auto flex min-h-screen max-w-md items-center px-4">
    <div class="w-full rounded-xl border-2 border-dashed border-amber-400 bg-white p-6 text-center shadow">
      <p class="rounded bg-amber-100 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-amber-900">Simulation — aucun vrai paiement</p>
      <h1 class="mt-4 font-serif text-2xl font-bold text-navy">Page de paiement fictive</h1>
      <p v-if="info" class="mt-3 text-lg">Don de <strong>{{ formatAmount(info.amount, info.currency) }}</strong> <span class="text-sm text-slate-600">({{ METHOD_LABEL[info.method ?? ''] }})</span></p>
      <p v-if="error" class="mt-3 text-red-700" role="alert">{{ error }}</p>
      <div class="mt-6 space-y-3">
        <button :disabled="busy" class="w-full rounded bg-green-700 px-4 py-3 font-medium text-white disabled:opacity-60" @click="choose('pay')">Simuler un paiement réussi</button>
        <button :disabled="busy" class="w-full rounded bg-red-700 px-4 py-3 font-medium text-white disabled:opacity-60" @click="choose('fail')">Simuler un échec</button>
        <button :disabled="busy" class="w-full rounded border border-slate-400 px-4 py-3 disabled:opacity-60" @click="choose('cancel')">Annuler</button>
      </div>
    </div>
  </main>
</template>
