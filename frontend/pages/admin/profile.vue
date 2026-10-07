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
    <h1 class="font-serif text-3xl font-bold text-navy">Mon compte</h1>
    <p class="mt-2 text-slate-600">{{ user?.firstName }} {{ user?.lastName }} · {{ user?.email }}</p>

    <form class="mt-6 space-y-4 card p-5" @submit.prevent="submit">
      <h2 class="font-semibold">Changer mon mot de passe</h2>
      <label class="block text-sm">
        <span class="mb-1.5 block font-semibold text-navy">Mot de passe actuel</span>
        <input v-model="currentPassword" type="password" required autocomplete="current-password" class="field" />
      </label>
      <label class="block text-sm">
        <span class="mb-1.5 block font-semibold text-navy">Nouveau mot de passe (10 caractères minimum)</span>
        <input v-model="newPassword" type="password" required minlength="10" autocomplete="new-password" class="field" />
      </label>
      <label class="block text-sm">
        <span class="mb-1.5 block font-semibold text-navy">Confirmer le nouveau mot de passe</span>
        <input v-model="confirm" type="password" required minlength="10" autocomplete="new-password" class="field" />
      </label>
      <p v-if="err" class="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700" role="alert">{{ err }}</p>
      <p v-if="msg" class="rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-800" role="status">{{ msg }}</p>
      <button :disabled="loading" class="btn btn-sm btn-navy disabled:opacity-60">Enregistrer</button>
    </form>
  </div>
</template>
