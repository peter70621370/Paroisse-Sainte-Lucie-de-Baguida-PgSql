<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' });
useHead({ title: 'Horaires des messes – Administration', meta: [{ name: 'robots', content: 'noindex' }] });

type S = { id: number; weekday: string; time: string; kind: string; language: string | null; location: string | null; notes: string | null; active: boolean; sortOrder: number };

const { user } = useAuth();
const canWrite = computed(() => user.value?.role !== 'CONTRIBUTOR');

const { data, refresh } = await useAdminFetch<{ items: S[] }>('/api/admin/mass-schedules', { query: { pageSize: 100 } });
const kinds = { MASS: 'Messe', CONFESSION: 'Confessions', ADORATION: 'Adoration', OTHER: 'Autre' } as Record<string, string>;
const dayLabel = Object.fromEntries(weekdays) as Record<string, string>;

const editingId = ref<number | null>(null);
const blank = () => ({ weekday: 'SUNDAY', time: '08:00', kind: 'MASS', language: '', location: '', notes: '', active: true, sortOrder: 0 });
const form = reactive(blank());
const err = ref('');
const msg = ref('');

function reset() { editingId.value = null; Object.assign(form, blank()); }
function edit(s: S) {
  editingId.value = s.id;
  Object.assign(form, { weekday: s.weekday, time: s.time, kind: s.kind, language: s.language ?? '', location: s.location ?? '', notes: s.notes ?? '', active: s.active, sortOrder: s.sortOrder });
  err.value = msg.value = '';
}

async function save() {
  err.value = msg.value = '';
  try {
    if (editingId.value) await $fetch(`/api/admin/mass-schedules/${editingId.value}`, { method: 'PATCH', body: { ...form } });
    else await $fetch('/api/admin/mass-schedules', { method: 'POST', body: { ...form } });
    msg.value = 'Horaire enregistré.';
    reset();
    await refresh();
  } catch (e) {
    err.value = apiError(e);
  }
}

async function remove(s: S) {
  if (!confirm(`Supprimer l'horaire du ${dayLabel[s.weekday]?.toLowerCase()} à ${s.time} ?`)) return;
  try {
    await $fetch(`/api/admin/mass-schedules/${s.id}`, { method: 'DELETE' });
    await refresh();
  } catch (e) {
    err.value = apiError(e);
  }
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-[#1F3A5F]">Horaires des messes et confessions</h1>
    <p v-if="!canWrite" class="mt-2 text-sm text-slate-600">Lecture seule : seuls les éditeurs et administrateurs peuvent modifier les horaires.</p>

    <form v-if="canWrite" class="mt-4 grid max-w-3xl gap-3 rounded-xl bg-white p-5 shadow sm:grid-cols-3" @submit.prevent="save">
      <h2 class="font-semibold sm:col-span-3">{{ editingId ? 'Modifier l\'horaire' : 'Nouvel horaire' }}</h2>
      <label class="text-sm">
        <span class="mb-1 block font-medium">Jour</span>
        <select v-model="form.weekday" class="w-full rounded border border-slate-300 px-3 py-2">
          <option v-for="[v, l] in weekdays" :key="v" :value="v">{{ l }}</option>
        </select>
      </label>
      <label class="text-sm">
        <span class="mb-1 block font-medium">Heure</span>
        <input v-model="form.time" type="time" required class="w-full rounded border border-slate-300 px-3 py-2" />
      </label>
      <label class="text-sm">
        <span class="mb-1 block font-medium">Type</span>
        <select v-model="form.kind" class="w-full rounded border border-slate-300 px-3 py-2">
          <option v-for="(l, v) in kinds" :key="v" :value="v">{{ l }}</option>
        </select>
      </label>
      <label class="text-sm">
        <span class="mb-1 block font-medium">Langue</span>
        <input v-model="form.language" maxlength="50" placeholder="Français" class="w-full rounded border border-slate-300 px-3 py-2" />
      </label>
      <label class="text-sm">
        <span class="mb-1 block font-medium">Lieu</span>
        <input v-model="form.location" maxlength="255" placeholder="Église principale" class="w-full rounded border border-slate-300 px-3 py-2" />
      </label>
      <label class="text-sm">
        <span class="mb-1 block font-medium">Note</span>
        <input v-model="form.notes" maxlength="255" class="w-full rounded border border-slate-300 px-3 py-2" />
      </label>
      <label class="flex items-center gap-2 text-sm">
        <input v-model="form.active" type="checkbox" class="h-4 w-4" /> Afficher sur le site
      </label>
      <p v-if="err" class="rounded bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-3" role="alert">{{ err }}</p>
      <p v-if="msg" class="rounded bg-green-50 px-3 py-2 text-sm text-green-800 sm:col-span-3" role="status">{{ msg }}</p>
      <div class="flex gap-2 sm:col-span-3">
        <button class="rounded bg-[#1F3A5F] px-4 py-2 text-sm text-white">Enregistrer</button>
        <button v-if="editingId" type="button" class="rounded border border-slate-300 px-4 py-2 text-sm" @click="reset">Annuler</button>
      </div>
    </form>

    <div class="mt-6 overflow-x-auto rounded-xl bg-white shadow">
      <table class="w-full text-left text-sm">
        <thead class="border-b bg-slate-50 text-slate-600">
          <tr><th class="px-4 py-3">Jour</th><th class="px-4 py-3">Heure</th><th class="px-4 py-3">Type</th><th class="px-4 py-3">Langue / lieu</th><th class="px-4 py-3">Affiché</th><th class="px-4 py-3"></th></tr>
        </thead>
        <tbody>
          <tr v-for="s in data?.items" :key="s.id" class="border-b last:border-0">
            <td class="px-4 py-3 font-medium">{{ dayLabel[s.weekday] }}</td>
            <td class="px-4 py-3">{{ s.time }}</td>
            <td class="px-4 py-3">{{ kinds[s.kind] }}</td>
            <td class="px-4 py-3 text-slate-600">{{ [s.language, s.location, s.notes].filter(Boolean).join(' · ') }}</td>
            <td class="px-4 py-3">{{ s.active ? 'Oui' : 'Non' }}</td>
            <td class="whitespace-nowrap px-4 py-3 text-right">
              <template v-if="canWrite">
                <button class="mr-3 text-[#1F3A5F] underline" @click="edit(s)">Modifier</button>
                <button class="text-red-700 underline" @click="remove(s)">Supprimer</button>
              </template>
            </td>
          </tr>
          <tr v-if="!data?.items.length"><td colspan="6" class="px-4 py-6 text-center text-slate-600">Aucun horaire.</td></tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
