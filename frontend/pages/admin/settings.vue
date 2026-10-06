<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' });
useHead({ title: 'Paramètres – Administration', meta: [{ name: 'robots', content: 'noindex' }] });

import type { PickedMedia } from '~/components/MediaPicker.vue';

type Field = { key: string; label: string; type: 'text' | 'textarea' | 'image'; group: string };
type Res = { settings: Record<string, string>; fields: Field[] };

const { data, error: loadError } = await useAdminFetch<Res>('/api/admin/settings');

const form = reactive<Record<string, string>>({ ...(data.value?.settings ?? {}) });
const groups = computed(() => {
  const out: { name: string; fields: Field[] }[] = [];
  for (const f of data.value?.fields ?? []) {
    let g = out.find((x) => x.name === f.group);
    if (!g) out.push((g = { name: f.group, fields: [] }));
    g.fields.push(f);
  }
  return out;
});

// Image provisoire affichée tant qu'aucune image n'est choisie
const fallback: Record<string, string> = { 'site.logo': PLACEHOLDERS.logo, 'home.heroImage': PLACEHOLDERS.hero };
const pickerFor = ref<string | null>(null);
function pick(m: PickedMedia) {
  if (pickerFor.value) form[pickerFor.value] = m.url;
  pickerFor.value = null;
}

const msg = ref('');
const err = ref('');
const saving = ref(false);

async function save() {
  msg.value = err.value = '';
  saving.value = true;
  try {
    const res = await $fetch<Res>('/api/admin/settings', { method: 'PUT', body: form });
    Object.assign(form, res.settings);
    await refreshNuxtData('site-settings');
    msg.value = 'Paramètres enregistrés. Le site public est à jour.';
  } catch (e) {
    err.value = apiError(e);
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="max-w-3xl">
    <h1 class="text-2xl font-bold text-navy">Paramètres du site</h1>
    <p class="mt-1 text-sm text-slate-600">Identité, page d'accueil, coordonnées et réseaux sociaux affichés sur le site public.</p>

    <p v-if="loadError" class="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">Impossible de charger les paramètres (droits insuffisants ?).</p>

    <form v-else class="mt-6 space-y-6" @submit.prevent="save">
      <fieldset v-for="g in groups" :key="g.name" class="space-y-4 rounded-xl bg-white p-5 shadow">
        <legend class="rounded bg-navy px-3 py-1 text-sm font-semibold text-white">{{ g.name }}</legend>

        <template v-for="f in g.fields" :key="f.key">
          <div v-if="f.type === 'image'" class="text-sm">
            <span class="mb-1 block font-medium">{{ f.label }}</span>
            <div class="flex flex-wrap items-center gap-4">
              <img :src="form[f.key] || fallback[f.key]" alt="" class="h-20 w-40 rounded border border-slate-200 bg-cream object-contain" />
              <div class="space-y-1">
                <button type="button" class="rounded border border-slate-300 px-3 py-2" @click="pickerFor = f.key">{{ form[f.key] ? 'Changer l\'image' : 'Choisir une image' }}</button>
                <button v-if="form[f.key]" type="button" class="ml-3 text-slate-600 underline" @click="form[f.key] = ''">Revenir à l'image provisoire</button>
                <p v-if="!form[f.key]" class="text-xs text-amber-700">Image provisoire actuellement affichée sur le site.</p>
              </div>
            </div>
          </div>

          <label v-else-if="f.type === 'textarea'" class="block text-sm">
            <span class="mb-1 block font-medium">{{ f.label }}</span>
            <textarea v-model="form[f.key]" rows="3" maxlength="1000" class="w-full rounded border border-slate-300 px-3 py-2" />
          </label>

          <label v-else class="block text-sm">
            <span class="mb-1 block font-medium">{{ f.label }}</span>
            <input v-model="form[f.key]" maxlength="500" class="w-full rounded border border-slate-300 px-3 py-2" />
          </label>
        </template>
      </fieldset>

      <p v-if="err" class="rounded bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{{ err }}</p>
      <p v-if="msg" class="rounded bg-green-50 px-3 py-2 text-sm text-green-800" role="status">{{ msg }}</p>
      <button :disabled="saving" class="rounded bg-navy px-5 py-2 text-white disabled:opacity-60">{{ saving ? 'Enregistrement…' : 'Enregistrer' }}</button>
    </form>

    <MediaPicker v-if="pickerFor" type="image" @select="pick" @close="pickerFor = null" />
  </div>
</template>
