<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' });
useHead({ title: 'Bulletins – Administration', meta: [{ name: 'robots', content: 'noindex' }] });

import type { PickedMedia } from '~/components/MediaPicker.vue';

type B = { id: number; title: string; date: string; status: 'DRAFT' | 'PUBLISHED'; file: { id: number; filename: string; url: string } | null };

const { user } = useAuth();
const canPublish = computed(() => user.value?.role !== 'CONTRIBUTOR');
const canDelete = canPublish;

const page = ref(1);
const { data, refresh } = await useAdminFetch<{ items: B[]; total: number; pageSize: number }>('/api/admin/bulletins', { query: computed(() => ({ page: page.value })), watch: [page] });
const pages = computed(() => Math.max(1, Math.ceil((data.value?.total ?? 0) / (data.value?.pageSize ?? 20))));

const editingId = ref<number | null>(null);
const form = reactive({ title: '', date: new Date().toISOString().slice(0, 10), fileId: 0, fileName: '', status: 'DRAFT' as 'DRAFT' | 'PUBLISHED' });
const showPicker = ref(false);
const err = ref('');
const msg = ref('');

function reset() {
  editingId.value = null;
  Object.assign(form, { title: '', date: new Date().toISOString().slice(0, 10), fileId: 0, fileName: '', status: 'DRAFT' });
}
function edit(b: B) {
  editingId.value = b.id;
  Object.assign(form, { title: b.title, date: dateOnly(b.date), fileId: b.file?.id ?? 0, fileName: b.file?.filename ?? '', status: b.status });
  err.value = msg.value = '';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function pick(m: PickedMedia) {
  form.fileId = m.id;
  form.fileName = m.filename;
  showPicker.value = false;
}

async function save() {
  err.value = msg.value = '';
  if (!form.fileId) {
    err.value = 'Choisissez le fichier PDF du bulletin.';
    return;
  }
  const body = { title: form.title, date: form.date, fileId: form.fileId, status: form.status };
  try {
    if (editingId.value) await $fetch(`/api/admin/bulletins/${editingId.value}`, { method: 'PATCH', body });
    else await $fetch('/api/admin/bulletins', { method: 'POST', body });
    msg.value = 'Bulletin enregistré.';
    reset();
    await refresh();
  } catch (e) {
    err.value = apiError(e);
  }
}

async function remove(b: B) {
  if (!confirm(`Supprimer le bulletin « ${b.title} » ?`)) return;
  try {
    await $fetch(`/api/admin/bulletins/${b.id}`, { method: 'DELETE' });
    await refresh();
  } catch (e) {
    err.value = apiError(e);
  }
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-[#1F3A5F]">Bulletins hebdomadaires</h1>

    <form class="mt-4 grid max-w-3xl gap-3 rounded-xl bg-white p-5 shadow sm:grid-cols-2" @submit.prevent="save">
      <h2 class="font-semibold sm:col-span-2">{{ editingId ? 'Modifier le bulletin' : 'Nouveau bulletin' }}</h2>
      <label class="text-sm sm:col-span-2">
        <span class="mb-1 block font-medium">Titre</span>
        <input v-model="form.title" required maxlength="255" placeholder="Bulletin du dimanche 5 octobre 2026" class="w-full rounded border border-slate-300 px-3 py-2" />
      </label>
      <label class="text-sm">
        <span class="mb-1 block font-medium">Date</span>
        <input v-model="form.date" type="date" required class="w-full rounded border border-slate-300 px-3 py-2" />
      </label>
      <label class="text-sm">
        <span class="mb-1 block font-medium">Statut</span>
        <select v-model="form.status" class="w-full rounded border border-slate-300 px-3 py-2">
          <option value="DRAFT">Brouillon</option>
          <option v-if="canPublish" value="PUBLISHED">Publié</option>
        </select>
      </label>
      <div class="text-sm sm:col-span-2">
        <span class="mb-1 block font-medium">Fichier PDF</span>
        <div class="flex items-center gap-3">
          <button type="button" class="rounded border border-slate-300 px-3 py-2" @click="showPicker = true">{{ form.fileId ? 'Changer le PDF' : 'Choisir un PDF' }}</button>
          <span class="truncate text-slate-600">{{ form.fileName || 'Aucun fichier choisi' }}</span>
        </div>
      </div>

      <p v-if="err" class="rounded bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2" role="alert">{{ err }}</p>
      <p v-if="msg" class="rounded bg-green-50 px-3 py-2 text-sm text-green-800 sm:col-span-2" role="status">{{ msg }}</p>
      <div class="flex gap-2 sm:col-span-2">
        <button class="rounded bg-[#1F3A5F] px-4 py-2 text-sm text-white">Enregistrer</button>
        <button v-if="editingId" type="button" class="rounded border border-slate-300 px-4 py-2 text-sm" @click="reset">Annuler</button>
      </div>
    </form>

    <div class="mt-6 overflow-x-auto rounded-xl bg-white shadow">
      <table class="w-full text-left text-sm">
        <thead class="border-b bg-slate-50 text-slate-600">
          <tr><th class="px-4 py-3">Titre</th><th class="px-4 py-3">Date</th><th class="px-4 py-3">PDF</th><th class="px-4 py-3">Statut</th><th class="px-4 py-3"></th></tr>
        </thead>
        <tbody>
          <tr v-for="b in data?.items" :key="b.id" class="border-b last:border-0">
            <td class="px-4 py-3 font-medium">{{ b.title }}</td>
            <td class="px-4 py-3">{{ fmtDate(b.date) }}</td>
            <td class="px-4 py-3"><a v-if="b.file" :href="b.file.url" target="_blank" rel="noopener" class="text-[#1F3A5F] underline">Ouvrir</a></td>
            <td class="px-4 py-3">
              <span :class="['rounded-full px-2 py-0.5 text-xs', b.status === 'PUBLISHED' ? 'bg-green-100 text-green-800' : 'bg-slate-200 text-slate-700']">{{ b.status === 'PUBLISHED' ? 'Publié' : 'Brouillon' }}</span>
            </td>
            <td class="whitespace-nowrap px-4 py-3 text-right">
              <button class="mr-3 text-[#1F3A5F] underline" @click="edit(b)">Modifier</button>
              <button v-if="canDelete" class="text-red-700 underline" @click="remove(b)">Supprimer</button>
            </td>
          </tr>
          <tr v-if="!data?.items.length"><td colspan="5" class="px-4 py-6 text-center text-slate-500">Aucun bulletin.</td></tr>
        </tbody>
      </table>
    </div>

    <div v-if="pages > 1" class="mt-4 flex items-center gap-3 text-sm">
      <button class="rounded border px-3 py-1 disabled:opacity-40" :disabled="page <= 1" @click="page--">Précédent</button>
      <span>Page {{ page }} / {{ pages }}</span>
      <button class="rounded border px-3 py-1 disabled:opacity-40" :disabled="page >= pages" @click="page++">Suivant</button>
    </div>

    <MediaPicker v-if="showPicker" type="pdf" @select="pick" @close="showPicker = false" />
  </div>
</template>
