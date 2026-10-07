<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' });
useHead({ title: 'Personnel pastoral – Administration', meta: [{ name: 'robots', content: 'noindex' }] });

import type { PickedMedia } from '~/components/MediaPicker.vue';

type P = { id: number; fullName: string; function: string; bio: string | null; active: boolean; sortOrder: number; photo: { id: number; thumbUrl: string | null; url: string } | null };

const { user } = useAuth();
const canWrite = computed(() => user.value?.role !== 'CONTRIBUTOR');

const { data, refresh } = await useAdminFetch<{ items: P[] }>('/api/admin/staff', { query: { pageSize: 100 } });

const editingId = ref<number | null>(null);
const blank = () => ({ fullName: '', function: '', bio: '', photoId: null as number | null, photoUrl: '', active: true, sortOrder: 0 });
const form = reactive(blank());
const showPicker = ref(false);
const err = ref('');
const msg = ref('');

function reset() { editingId.value = null; Object.assign(form, blank()); }
function edit(p: P) {
  editingId.value = p.id;
  Object.assign(form, { fullName: p.fullName, function: p.function, bio: p.bio ?? '', photoId: p.photo?.id ?? null, photoUrl: p.photo?.thumbUrl ?? '', active: p.active, sortOrder: p.sortOrder });
  err.value = msg.value = '';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function pick(m: PickedMedia) {
  form.photoId = m.id;
  form.photoUrl = m.thumbUrl ?? m.url;
  showPicker.value = false;
}

async function save() {
  err.value = msg.value = '';
  const body = { fullName: form.fullName, function: form.function, bio: form.bio, photoId: form.photoId, active: form.active, sortOrder: form.sortOrder };
  try {
    if (editingId.value) await $fetch(`/api/admin/staff/${editingId.value}`, { method: 'PATCH', body });
    else await $fetch('/api/admin/staff', { method: 'POST', body });
    msg.value = 'Fiche enregistrée.';
    reset();
    await refresh();
  } catch (e) {
    err.value = apiError(e);
  }
}

async function remove(p: P) {
  if (!confirm(`Supprimer la fiche de « ${p.fullName} » ?`)) return;
  try {
    await $fetch(`/api/admin/staff/${p.id}`, { method: 'DELETE' });
    await refresh();
  } catch (e) {
    err.value = apiError(e);
  }
}
</script>

<template>
  <div>
    <h1 class="font-serif text-3xl font-bold text-navy">Personnel pastoral</h1>
    <p v-if="!canWrite" class="mt-2 text-sm text-slate-600">Lecture seule : seuls les éditeurs et administrateurs peuvent modifier les fiches.</p>

    <form v-if="canWrite" class="mt-4 grid max-w-3xl gap-3 card p-5 sm:grid-cols-2" @submit.prevent="save">
      <h2 class="font-semibold sm:col-span-2">{{ editingId ? 'Modifier la fiche' : 'Nouvelle fiche' }}</h2>
      <label class="text-sm">
        <span class="mb-1.5 block font-semibold text-navy">Nom complet</span>
        <input v-model="form.fullName" required maxlength="150" placeholder="Abbé Jean Dupont" class="field" />
      </label>
      <label class="text-sm">
        <span class="mb-1.5 block font-semibold text-navy">Fonction</span>
        <input v-model="form.function" required maxlength="150" placeholder="Curé / Vicaire / Diacre / Catéchiste" class="field" />
      </label>
      <label class="text-sm sm:col-span-2">
        <span class="mb-1.5 block font-semibold text-navy">Présentation (facultatif)</span>
        <textarea v-model="form.bio" rows="3" maxlength="5000" class="field" />
      </label>
      <div class="text-sm">
        <span class="mb-1.5 block font-semibold text-navy">Photo</span>
        <div class="flex items-center gap-3">
          <img v-if="form.photoUrl" :src="form.photoUrl" alt="" class="h-14 w-14 rounded-full object-cover" />
          <button type="button" class="field !w-auto" @click="showPicker = true">{{ form.photoId ? 'Changer' : 'Choisir une photo' }}</button>
          <button v-if="form.photoId" type="button" class="text-slate-600 underline" @click="form.photoId = null; form.photoUrl = ''">Retirer</button>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3 text-sm">
        <label>
          <span class="mb-1.5 block font-semibold text-navy">Ordre d'affichage</span>
          <input v-model.number="form.sortOrder" type="number" min="0" max="9999" class="field" />
        </label>
        <label class="flex items-end gap-2 pb-2"><input v-model="form.active" type="checkbox" class="h-4 w-4" /> Afficher sur le site</label>
      </div>
      <p v-if="err" class="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 sm:col-span-2" role="alert">{{ err }}</p>
      <p v-if="msg" class="rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-800 sm:col-span-2" role="status">{{ msg }}</p>
      <div class="flex gap-2 sm:col-span-2">
        <button class="btn btn-sm btn-navy">Enregistrer</button>
        <button v-if="editingId" type="button" class="btn btn-sm btn-outline" @click="reset">Annuler</button>
      </div>
    </form>

    <ul class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <li v-for="p in data?.items" :key="p.id" class="flex gap-3 card p-5">
        <img v-if="p.photo?.thumbUrl" :src="p.photo.thumbUrl" alt="" class="h-16 w-16 shrink-0 rounded-full object-cover" />
        <div v-else class="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xl text-slate-600">{{ p.fullName.charAt(0) }}</div>
        <div class="min-w-0 text-sm">
          <p class="truncate font-semibold">{{ p.fullName }}</p>
          <p class="text-slate-600">{{ p.function }}<span v-if="!p.active" class="ml-1 text-xs text-amber-700">(masqué)</span></p>
          <div v-if="canWrite" class="mt-2 flex gap-3">
            <button class="text-navy underline" @click="edit(p)">Modifier</button>
            <button class="text-red-700 underline" @click="remove(p)">Supprimer</button>
          </div>
        </div>
      </li>
    </ul>
    <p v-if="!data?.items.length" class="mt-6 text-slate-600">Aucune fiche.</p>

    <MediaPicker v-if="showPicker" type="image" @select="pick" @close="showPicker = false" />
  </div>
</template>
