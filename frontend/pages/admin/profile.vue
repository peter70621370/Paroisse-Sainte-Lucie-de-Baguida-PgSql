<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' });
useHead({ title: 'Mon compte – Administration', meta: [{ name: 'robots', content: 'noindex' }] });

const { user } = useAuth();
const currentPassword = ref('');
const newPassword = ref('');
const confirm = ref('');
const msg = ref('');
const err = ref('');
const loading = ref(false);

async function submit() {
  msg.value = err.value = '';
  if (newPassword.value !== confirm.value) {
    err.value = 'Les deux mots de passe ne correspondent pas.';
    return;
  }
  loading.value = true;
  try {
    await $fetch('/api/auth/password', {
      method: 'POST',
      body: { currentPassword: currentPassword.value, newPassword: newPassword.value },
    });
    msg.value = 'Mot de passe modifié. Vos autres sessions ont été fermées.';
    currentPassword.value = newPassword.value = confirm.value = '';
  } catch (e) {
    err.value = apiError(e);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="max-w-md">
    <h1 class="text-2xl font-bold text-[#1F3A5F]">Mon compte</h1>
    <p class="mt-2 text-slate-600">{{ user?.firstName }} {{ user?.lastName }} · {{ user?.email }}</p>

    <form class="mt-6 space-y-4 rounded-xl bg-white p-5 shadow" @submit.prevent="submit">
      <h2 class="font-semibold">Changer mon mot de passe</h2>
      <label class="block text-sm">
        <span class="mb-1 block font-medium">Mot de passe actuel</span>
        <input v-model="currentPassword" type="password" required autocomplete="current-password" class="w-full rounded border border-slate-300 px-3 py-2" />
      </label>
      <label class="block text-sm">
        <span class="mb-1 block font-medium">Nouveau mot de passe (10 caractères minimum)</span>
        <input v-model="newPassword" type="password" required minlength="10" autocomplete="new-password" class="w-full rounded border border-slate-300 px-3 py-2" />
      </label>
      <label class="block text-sm">
        <span class="mb-1 block font-medium">Confirmer le nouveau mot de passe</span>
        <input v-model="confirm" type="password" required minlength="10" autocomplete="new-password" class="w-full rounded border border-slate-300 px-3 py-2" />
      </label>
      <p v-if="err" class="rounded bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{{ err }}</p>
      <p v-if="msg" class="rounded bg-green-50 px-3 py-2 text-sm text-green-800" role="status">{{ msg }}</p>
      <button :disabled="loading" class="rounded bg-[#1F3A5F] px-4 py-2 text-white disabled:opacity-60">Enregistrer</button>
    </form>
  </div>
</template>
