<script setup lang="ts">
usePageSeo('Confirmation d\'inscription', null, { noindex: true });

const token = String(useRoute().query.token ?? '');
const state = ref<'loading' | 'ok' | 'error'>('loading');

onMounted(async () => {
  try {
    await $fetch('/api/newsletter/confirm', { method: 'POST', body: { token } });
    state.value = 'ok';
  } catch {
    state.value = 'error';
  }
});
</script>

<template>
  <div>
    <PageTitle :title="t(`Lettre d'information`)" />
    <div class="mx-auto max-w-xl px-4 py-10 text-center">
      <p v-if="state === 'loading'" class="text-slate-600">{{ t(`Confirmation en cours…`) }}</p>
      <div v-else-if="state === 'ok'" class="rounded-lg border border-green-200 bg-green-50 p-8" role="status">
        <p class="font-serif text-2xl font-bold text-green-900">{{ t(`Inscription confirmée`) }}</p>
        <p class="mt-2 text-green-900/80">{{ t(`Merci ! Vous recevrez désormais les nouvelles de la paroisse. Vous pouvez vous désinscrire à tout moment grâce au lien présent dans chaque message.`) }}</p>
      </div>
      <div v-else class="rounded-lg border border-red-200 bg-red-50 p-8" role="alert">
        <p class="font-serif text-2xl font-bold text-red-900">{{ t(`Lien invalide`) }}</p>
        <p class="mt-2 text-red-900/80">{{ t(`Ce lien de confirmation n'est pas valide. Vous pouvez vous réinscrire depuis le bas de n'importe quelle page du site.`) }}</p>
      </div>
      <NuxtLink :to="lp('/')" class="mt-8 inline-block text-sm text-navy underline">{{ t(`Retour à l'accueil`) }}</NuxtLink>
    </div>
  </div>
</template>
