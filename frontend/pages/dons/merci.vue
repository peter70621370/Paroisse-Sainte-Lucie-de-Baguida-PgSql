<script setup lang="ts">
useHead({ title: 'Votre don', meta: [{ name: 'robots', content: 'noindex' }] });

type Result = { reference: string; status: 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED'; amount: number; currency: string; method: string | null; campaign: string | null };

const route = useRoute();
const reference = String(route.query.ref ?? '');
const cancelled = route.query.cancel === '1';
const result = ref<Result | null>(null);
const error = ref('');
const checking = ref(true);
let tries = 0;
let timer: ReturnType<typeof setTimeout> | undefined;

// Vérification auprès du prestataire (le paiement Mobile Money peut prendre quelques instants).
async function check() {
  checking.value = true;
  try {
    result.value = await $fetch<Result>(`/api/donations/${reference}/confirm`, { method: 'POST' });
    error.value = '';
    if (result.value.status === 'PENDING' && !cancelled && ++tries < 15) timer = setTimeout(check, 4000);
  } catch (e: any) {
    error.value = e?.statusCode === 404 ? 'Don introuvable. Vérifiez le lien reçu.' : 'Vérification impossible pour le moment.';
  } finally {
    checking.value = false;
  }
}
onMounted(() => (reference ? check() : (error.value = 'Référence de don manquante.')));
onBeforeUnmount(() => clearTimeout(timer));
</script>

<template>
  <div>
    <PageTitle :title="t(`Votre don`)" />
    <div class="mx-auto max-w-xl px-4 py-10 text-center">
      <p v-if="error" class="rounded bg-red-50 px-4 py-3 text-red-700" role="alert">{{ t(error) }}</p>

      <div v-else-if="result?.status === 'SUCCEEDED'" class="rounded-lg border border-green-200 bg-green-50 p-8" role="status">
        <p class="font-serif text-3xl font-bold text-green-900">{{ t(`Merci pour votre don !`) }}</p>
        <p class="mt-3 text-lg">{{ formatAmount(result.amount, result.currency) }}<span v-if="result.campaign"> · {{ result.campaign }}</span></p>
        <p class="mt-2 text-sm text-green-900/80">{{ t(`Que le Seigneur vous bénisse. Si vous avez renseigné votre e-mail, une confirmation vous a été envoyée.`) }}</p>
        <p class="mt-4 text-xs text-green-900/70">{{ t(`Référence`) }} : {{ result.reference }}</p>
      </div>

      <div v-else-if="result && (result.status === 'FAILED' || result.status === 'CANCELLED')" class="rounded-lg border border-red-200 bg-red-50 p-8" role="alert">
        <p class="font-serif text-2xl font-bold text-red-900">{{ t(`Le paiement n'a pas abouti`) }}</p>
        <p class="mt-2 text-red-900/80">{{ result.status === 'CANCELLED' ? t(`Le paiement a été annulé.`) : t(`Aucun montant n'a été débité.`) }} {{ t(`Vous pouvez réessayer.`) }}</p>
        <NuxtLink :to="lp('/dons')" class="mt-5 inline-block rounded bg-navy px-5 py-2 text-white">{{ t(`Réessayer`) }}</NuxtLink>
      </div>

      <div v-else class="rounded-lg border border-gold/30 bg-white p-8" role="status">
        <p class="font-serif text-2xl font-bold text-navy">{{ cancelled ? t(`Paiement non finalisé`) : t(`Vérification de votre paiement…`) }}</p>
        <p class="mt-2 text-slate-600">
          {{ cancelled ? t(`Vous avez quitté la page de paiement.`) : t(`Cela peut prendre quelques instants (par exemple, le temps de valider sur votre téléphone).`) }}
        </p>
        <button v-if="!checking" class="mt-5 rounded border border-navy px-4 py-2 text-navy hover:bg-navy hover:text-white" @click="tries = 0; check()">{{ t(`Vérifier à nouveau`) }}</button>
        <p v-else class="mt-5 text-sm text-slate-600">{{ t(`Vérification en cours…`) }}</p>
        <p class="mt-5 text-xs text-slate-600">{{ t(`Si vous avez bien payé, votre don sera pris en compte automatiquement : vous pouvez fermer cette page.`) }}</p>
      </div>

      <NuxtLink :to="lp('/')" class="mt-8 inline-block text-sm text-navy underline">{{ t(`Retour à l'accueil`) }}</NuxtLink>
    </div>
  </div>
</template>
