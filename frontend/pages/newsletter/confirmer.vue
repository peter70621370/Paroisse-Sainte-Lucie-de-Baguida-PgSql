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
    <PageTitle title="Lettre d'information" />
    <div class="mx-auto max-w-xl px-4 py-10 text-center">
      <p v-if="state === 'loading'" class="text-slate-600">Confirmation en cours…</p>
      <div v-else-if="state === 'ok'" class="rounded-lg border border-green-200 bg-green-50 p-8" role="status">
        <p class="font-serif text-2xl font-bold text-green-900">Inscription confirmée</p>
        <p class="mt-2 text-green-900/80">Merci ! Vous recevrez désormais les nouvelles de la paroisse. Vous pouvez vous désinscrire à tout moment grâce au lien présent dans chaque message.</p>
      </div>
      <div v-else class="rounded-lg border border-red-200 bg-red-50 p-8" role="alert">
        <p class="font-serif text-2xl font-bold text-red-900">Lien invalide</p>
        <p class="mt-2 text-red-900/80">Ce lien de confirmation n'est pas valide. Vous pouvez vous réinscrire depuis le bas de n'importe quelle page du site.</p>
      </div>
      <NuxtLink to="/" class="mt-8 inline-block text-sm text-navy underline">Retour à l'accueil</NuxtLink>
    </div>
  </div>
</template>
