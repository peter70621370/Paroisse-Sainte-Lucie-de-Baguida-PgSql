<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' });
useHead({ title: 'Paramètres – Administration', meta: [{ name: 'robots', content: 'noindex' }] });

type Res = { settings: Record<string, string>; labels: Record<string, string> };
const { data, error: loadError } = await useFetch<Res>('/api/admin/settings', { headers: useRequestHeaders(['cookie']) });

const form = reactive<Record<string, string>>({ ...(data.value?.settings ?? {}) });
const msg = ref('');
const err = ref('');
const saving = ref(false);

async function save() {
  msg.value = err.value = '';
  saving.value = true;
  try {
    const res = await $fetch<Res>('/api/admin/settings', { method: 'PUT', body: form });
    Object.assign(form, res.settings);
    msg.value = 'Paramètres enregistrés.';
  } catch (e) {
    err.value = apiError(e);
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="max-w-2xl">
    <h1 class="text-2xl font-bold text-[#1F3A5F]">Paramètres du site</h1>
    <p class="mt-1 text-sm text-slate-500">Coordonnées et réseaux sociaux affichés sur le site public (pied de page, page Contact).</p>

    <p v-if="loadError" class="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">Impossible de charger les paramètres (droits insuffisants ?).</p>

    <form v-else class="mt-6 space-y-4 rounded-xl bg-white p-5 shadow" @submit.prevent="save">
      <label v-for="(label, key) in data?.labels" :key="key" class="block text-sm">
        <span class="mb-1 block font-medium">{{ label }}</span>
        <input v-model="form[key]" maxlength="500" class="w-full rounded border border-slate-300 px-3 py-2" />
      </label>
      <p v-if="err" class="rounded bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{{ err }}</p>
      <p v-if="msg" class="rounded bg-green-50 px-3 py-2 text-sm text-green-800" role="status">{{ msg }}</p>
      <button :disabled="saving" class="rounded bg-[#1F3A5F] px-4 py-2 text-white disabled:opacity-60">Enregistrer</button>
    </form>
  </div>
</template>
