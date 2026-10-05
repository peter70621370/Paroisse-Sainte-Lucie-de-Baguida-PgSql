<script setup lang="ts">
// Inscription à la lettre d'information (double confirmation par e-mail).
const email = ref('');
const consent = ref(false);
const trap = ref('');
const loading = ref(false);
const sent = ref(false);
const error = ref('');

async function submit() {
  error.value = '';
  loading.value = true;
  try {
    await $fetch('/api/newsletter/subscribe', { method: 'POST', body: { email: email.value, consent: consent.value, website: trap.value } });
    sent.value = true;
  } catch (e: any) {
    const d = e?.data?.details;
    error.value = e?.statusCode === 429 ? 'Trop de tentatives. Réessayez dans quelques minutes.' : d ? Object.values(d).flat().join(', ') : e?.data?.error || 'Inscription impossible. Réessayez.';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div>
    <p v-if="sent" class="rounded bg-green-900/40 px-3 py-2 text-sm text-green-100" role="status">
      Merci ! Un e-mail de confirmation vient de vous être envoyé : cliquez sur le lien qu'il contient pour finaliser votre inscription.
    </p>
    <form v-else novalidate @submit.prevent="submit">
      <label for="nl-email" class="text-sm">Recevez les nouvelles de la paroisse par e-mail</label>
      <div class="mt-2 flex flex-wrap gap-2">
        <input id="nl-email" v-model="email" type="email" required autocomplete="email" placeholder="Votre adresse e-mail" class="min-w-0 flex-1 rounded border border-white/30 bg-white/10 px-3 py-2 text-white placeholder-white/50 focus:border-gold-light focus:outline-none" />
        <button :disabled="loading" class="rounded bg-gold px-4 py-2 font-medium text-white hover:bg-gold/90 disabled:opacity-60">{{ loading ? '…' : 'S\'inscrire' }}</button>
      </div>
      <div class="absolute left-[-9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
        <label>Ne pas remplir <input v-model="trap" type="text" name="website" tabindex="-1" autocomplete="off" /></label>
      </div>
      <label class="mt-2 flex items-start gap-2 text-xs text-white/80">
        <input v-model="consent" type="checkbox" class="mt-0.5 h-4 w-4" />
        <span>J'accepte de recevoir la lettre d'information. Désinscription possible à tout moment. <NuxtLink to="/p/confidentialite" class="underline">Confidentialité</NuxtLink></span>
      </label>
      <p v-if="error" class="mt-2 text-sm text-red-200" role="alert">{{ error }}</p>
    </form>
  </div>
</template>
