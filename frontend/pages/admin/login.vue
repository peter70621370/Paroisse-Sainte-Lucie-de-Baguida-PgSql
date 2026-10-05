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
  <main class="flex min-h-screen items-center justify-center px-4">
    <form class="w-full max-w-sm space-y-4 rounded-xl bg-white p-6 shadow" @submit.prevent="submit">
      <h1 class="text-xl font-bold text-[#1F3A5F]">Administration</h1>
      <p class="text-sm text-slate-500">Paroisse Sainte Lucie de Baguida</p>

      <label class="block text-sm">
        <span class="mb-1 block font-medium">E-mail</span>
        <input v-model="email" type="email" required autocomplete="username" class="w-full rounded border border-slate-300 px-3 py-2" />
      </label>
      <label class="block text-sm">
        <span class="mb-1 block font-medium">Mot de passe</span>
        <input v-model="password" type="password" required autocomplete="current-password" class="w-full rounded border border-slate-300 px-3 py-2" />
      </label>

      <p v-if="error" class="rounded bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{{ error }}</p>

      <button :disabled="loading" class="w-full rounded bg-[#1F3A5F] py-2 font-medium text-white disabled:opacity-60">
        {{ loading ? 'Connexion…' : 'Se connecter' }}
      </button>
    </form>
  </main>
</template>
