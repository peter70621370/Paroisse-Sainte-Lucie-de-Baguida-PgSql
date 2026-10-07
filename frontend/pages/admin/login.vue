<script setup lang="ts">
definePageMeta({ layout: false });
useHead({ title: 'Connexion – Administration', meta: [{ name: 'robots', content: 'noindex' }] });

const { user, login } = useAuth();
if (user.value) await navigateTo('/admin');

const email = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

async function submit() {
  error.value = '';
  loading.value = true;
  try {
    await login(email.value, password.value);
    await navigateTo('/admin');
  } catch (e: any) {
    error.value =
      e?.statusCode === 429
        ? 'Trop de tentatives. Réessayez dans une minute.'
        : e?.data?.error || 'Connexion impossible.';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <main class="grid min-h-screen lg:grid-cols-2">
    <!-- Volet décoratif (ordinateur) -->
    <div class="bg-pattern relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-navy-deep via-navy-dark to-navy p-12 text-white lg:flex">
      <div class="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-gold/10 blur-3xl" aria-hidden="true" />
      <div class="flex items-center gap-4">
        <img :src="PLACEHOLDERS.emblem" alt="" class="h-16 w-16" />
        <div class="leading-tight">
          <p class="text-xs font-semibold uppercase tracking-[0.3em] text-gold-light">Paroisse</p>
          <p class="font-serif text-2xl font-bold">Sainte Lucie de Baguida</p>
        </div>
      </div>
      <div>
        <p class="font-serif text-3xl font-bold italic leading-tight text-gold-light xl:text-4xl">« Vous êtes la lumière du&nbsp;monde.&nbsp;»</p>
        <p class="mt-3 text-sm uppercase tracking-widest text-white/75">Matthieu 5, 14</p>
      </div>
      <p class="text-sm text-white/70">Espace réservé à l'équipe de la paroisse.</p>
    </div>

    <div class="flex items-center justify-center bg-cream px-4 py-12">
      <form class="w-full max-w-sm" @submit.prevent="submit">
        <img :src="PLACEHOLDERS.emblem" alt="" class="mb-6 h-14 w-14 lg:hidden" />
        <p class="eyebrow">Paroisse Sainte Lucie de Baguida</p>
        <h1 class="mt-2 font-serif text-4xl font-bold text-navy">Administration</h1>
        <p class="mt-2 text-slate-600">Connectez-vous pour gérer le contenu du site.</p>

        <div class="mt-8 space-y-5">
          <label class="block text-sm">
            <span class="mb-1.5 block font-semibold text-navy">E-mail</span>
            <input v-model="email" type="email" required autocomplete="username" class="field" />
          </label>
          <label class="block text-sm">
            <span class="mb-1.5 block font-semibold text-navy">Mot de passe</span>
            <input v-model="password" type="password" required autocomplete="current-password" class="field" />
          </label>

          <p v-if="error" class="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700" role="alert">{{ error }}</p>

          <button :disabled="loading" class="btn btn-navy w-full disabled:opacity-60">
            {{ loading ? 'Connexion…' : 'Se connecter' }}
          </button>
        </div>
        <p class="mt-8 text-center text-sm"><NuxtLink to="/" class="link-arrow"><Icon name="chevron-left" />Retour au site</NuxtLink></p>
      </form>
    </div>
  </main>
</template>
