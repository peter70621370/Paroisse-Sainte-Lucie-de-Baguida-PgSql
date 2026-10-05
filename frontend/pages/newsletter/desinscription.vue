<script setup lang="ts">
usePageSeo('Désinscription', null, { noindex: true });

const token = String(useRoute().query.token ?? '');
const state = ref<'ask' | 'busy' | 'done' | 'error'>('ask');

async function unsubscribe() {
  state.value = 'busy';
  try {
    await $fetch('/api/newsletter/unsubscribe', { method: 'POST', body: { token } });
    state.value = 'done';
  } catch {
    state.value = 'error';
  }
}
</script>

<template>
  <div>
    <PageTitle title="Se désinscrire" />
    <div class="mx-auto max-w-xl px-4 py-10 text-center">
      <div v-if="state === 'ask' || state === 'busy'" class="rounded-lg border border-gold/30 bg-white p-8 shadow-sm">
        <p class="font-serif text-xl font-semibold text-navy">Ne plus recevoir la lettre d'information ?</p>
        <button :disabled="state === 'busy'" class="mt-5 rounded bg-navy px-6 py-3 font-medium text-white hover:bg-navy-dark disabled:opacity-60" @click="unsubscribe">Confirmer ma désinscription</button>
      </div>
      <div v-else-if="state === 'done'" class="rounded-lg border border-green-200 bg-green-50 p-8" role="status">
        <p class="font-serif text-2xl font-bold text-green-900">Vous êtes désinscrit</p>
        <p class="mt-2 text-green-900/80">Vous ne recevrez plus la lettre d'information. Merci de votre attention jusqu'ici.</p>
      </div>
      <div v-else class="rounded-lg border border-red-200 bg-red-50 p-8" role="alert">
        <p class="font-serif text-2xl font-bold text-red-900">Lien invalide</p>
        <p class="mt-2 text-red-900/80">Ce lien de désinscription n'est pas valide. Écrivez-nous via la page Contact et nous vous retirerons de la liste.</p>
      </div>
      <NuxtLink to="/" class="mt-8 inline-block text-sm text-navy underline">Retour à l'accueil</NuxtLink>
    </div>
  </div>
</template>
