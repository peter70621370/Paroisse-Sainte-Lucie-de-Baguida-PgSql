<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' });
useHead({ title: 'Album – Administration', meta: [{ name: 'robots', content: 'noindex' }] });

import type { PickedMedia } from '~/components/MediaPicker.vue';

type Item = { id: number; type: 'image' | 'video'; caption: string | null; videoUrl: string | null; url: string | null; thumbUrl: string | null };

const route = useRoute();
const isNew = route.params.id === 'new';
const id = isNew ? null : Number(route.params.id);
const { user } = useAuth();
const canPublish = computed(() => user.value?.role !== 'CONTRIBUTOR');
const canEditItems = computed(() => user.value?.role !== 'CONTRIBUTOR');

const form = reactive({ title: '', slug: '', description: '', date: '', coverId: null as number | null, coverUrl: '', status: 'DRAFT' as 'DRAFT' | 'PUBLISHED' });
const items = ref<Item[]>([]);
const slugTouched = ref(!isNew);

if (id) {
  const { data, error } = await useAdminFetch<{ item: any }>(`/api/admin/albums/${id}`);
  if (error.value || !data.value) throw createError({ statusCode: 404, statusMessage: 'Album introuvable' });
  const a = data.value.item;
  Object.assign(form, { title: a.title, slug: a.slug, description: a.description ?? '', date: dateOnly(a.date), coverId: a.coverId, coverUrl: a.cover?.thumbUrl ?? '', status: a.status });
  items.value = a.items;
}
watch(() => form.title, (t) => { if (!slugTouched.value) form.slug = slugify(t); });

const err = ref('');
const msg = ref('');
const saving = ref(false);
const picker = ref<'cover' | 'item' | null>(null);

async function save() {
  err.value = msg.value = '';
  saving.value = true;
  const body = { title: form.title, slug: form.slug, description: form.description, date: form.date || null, coverId: form.coverId, status: form.status };
  try {
    if (id) { await $fetch(`/api/admin/albums/${id}`, { method: 'PATCH', body }); msg.value = 'Album enregistré.'; }
    else {
      const res = await $fetch<{ item: { id: number } }>('/api/admin/albums', { method: 'POST', body });
      await navigateTo(`/admin/albums/${res.item.id}`);
    }
  } catch (e) { err.value = apiError(e); } finally { saving.value = false; }
}

async function remove() {
  if (!confirm('Supprimer cet album et ses éléments (les fichiers de la médiathèque sont conservés) ?')) return;
  try { await $fetch(`/api/admin/albums/${id}`, { method: 'DELETE' }); await navigateTo('/admin/albums'); } catch (e) { err.value = apiError(e); }
}

function pick(m: PickedMedia) {
  if (picker.value === 'cover') { form.coverId = m.id; form.coverUrl = m.thumbUrl ?? m.url; }
  else addPhoto(m);
  picker.value = null;
}

async function addPhoto(m: PickedMedia) {
  err.value = '';
  try {
    const res = await $fetch<{ item: Item }>(`/api/admin/albums/${id}/items`, { method: 'POST', body: { mediaId: m.id } });
    items.value.push(res.item);
  } catch (e) { err.value = apiError(e); }
}

const video = reactive({ url: '', caption: '' });
async function addVideo() {
  err.value = '';
  try {
    const res = await $fetch<{ item: Item }>(`/api/admin/albums/${id}/items`, { method: 'POST', body: { videoUrl: video.url, caption: video.caption } });
    items.value.push(res.item);
    video.url = video.caption = '';
  } catch (e) { err.value = apiError(e); }
}

async function saveCaption(it: Item) {
  try { await $fetch(`/api/admin/albums/items/${it.id}`, { method: 'PATCH', body: { caption: it.caption } }); } catch (e) { err.value = apiError(e); }
}
async function removeItem(it: Item) {
  if (!confirm('Retirer cet élément de l\'album ?')) return;
  try { await $fetch(`/api/admin/albums/items/${it.id}`, { method: 'DELETE' }); items.value = items.value.filter((x) => x.id !== it.id); } catch (e) { err.value = apiError(e); }
}
async function move(i: number, d: number) {
  const j = i + d;
  if (j < 0 || j >= items.value.length) return;
  const copy = [...items.value];
  [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  items.value = copy;
  try { await $fetch(`/api/admin/albums/${id}/items/reorder`, { method: 'POST', body: { ids: copy.map((x) => x.id) } }); } catch (e) { err.value = apiError(e); }
}
</script>

<template>
  <div class="max-w-4xl">
    <NuxtLink to="/admin/albums" class="text-sm text-navy underline">← Albums</NuxtLink>
    <h1 class="mt-1 font-serif text-3xl font-bold text-navy">{{ isNew ? 'Nouvel album' : 'Modifier l\'album' }}</h1>

    <form class="mt-6 space-y-4" @submit.prevent="save">
      <label class="block text-sm"><span class="mb-1.5 block font-semibold text-navy">Titre</span><input v-model="form.title" required maxlength="255" placeholder="Fête patronale 2026" class="field" /></label>
      <div class="grid gap-3 sm:grid-cols-2">
        <label class="text-sm"><span class="mb-1.5 block font-semibold text-navy">Adresse (slug)</span><input v-model="form.slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" class="field" @input="slugTouched = true" /></label>
        <label class="text-sm"><span class="mb-1.5 block font-semibold text-navy">Date (facultatif)</span><input v-model="form.date" type="date" class="field" /></label>
      </div>
      <label class="block text-sm"><span class="mb-1.5 block font-semibold text-navy">Description (facultatif)</span><textarea v-model="form.description" rows="3" maxlength="5000" class="field" /></label>

      <div class="text-sm">
        <span class="mb-1.5 block font-semibold text-navy">Image de couverture (facultatif : sinon la première photo)</span>
        <div class="flex items-center gap-3">
          <img v-if="form.coverUrl" :src="form.coverUrl" alt="" class="h-16 w-24 rounded object-cover" />
          <button type="button" class="field !w-auto" @click="picker = 'cover'">{{ form.coverId ? 'Changer' : 'Choisir' }}</button>
          <button v-if="form.coverId" type="button" class="text-slate-600 underline" @click="form.coverId = null; form.coverUrl = ''">Retirer</button>
        </div>
      </div>

      <label class="block max-w-xs text-sm">
        <span class="mb-1.5 block font-semibold text-navy">Statut</span>
        <select v-model="form.status" class="field"><option value="DRAFT">Brouillon (non visible)</option><option v-if="canPublish" value="PUBLISHED">Publié</option></select>
      </label>

      <p v-if="err" class="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700" role="alert">{{ err }}</p>
      <p v-if="msg" class="rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-800" role="status">{{ msg }}</p>
      <div class="flex items-center gap-3">
        <button :disabled="saving" class="btn btn-sm btn-navy disabled:opacity-60">{{ saving ? 'Enregistrement…' : 'Enregistrer' }}</button>
        <button v-if="id && canPublish" type="button" class="text-sm text-red-700 underline" @click="remove">Supprimer</button>
      </div>
    </form>

    <section v-if="id" class="mt-10">
      <h2 class="text-xl font-bold text-navy">Photos et vidéos ({{ items.length }})</h2>
      <p v-if="!canEditItems" class="mt-1 text-sm text-slate-600">Seuls les éditeurs et administrateurs peuvent modifier le contenu de l'album.</p>
      <template v-else>
        <div class="mt-3 flex flex-wrap items-end gap-4 card p-5">
          <button type="button" class="btn btn-sm btn-navy" @click="picker = 'item'">+ Ajouter une photo</button>
          <div class="flex flex-wrap items-end gap-2">
            <label class="text-sm"><span class="mb-1.5 block font-semibold text-navy">Vidéo (lien YouTube / Facebook)</span><input v-model="video.url" type="url" placeholder="https://…" class="field !w-64" /></label>
            <label class="text-sm"><span class="mb-1.5 block font-semibold text-navy">Légende</span><input v-model="video.caption" maxlength="255" class="field !w-48" /></label>
            <button type="button" :disabled="!video.url" class="btn btn-sm btn-outline disabled:opacity-50" @click="addVideo">+ Ajouter la vidéo</button>
          </div>
        </div>

        <ul class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <li v-for="(it, i) in items" :key="it.id" class="overflow-hidden card">
            <img v-if="it.type === 'image'" :src="it.thumbUrl || it.url!" alt="" class="aspect-[4/3] w-full object-cover" />
            <div v-else class="flex aspect-[4/3] w-full flex-col items-center justify-center bg-navy-dark text-white"><span class="text-3xl" aria-hidden="true">▶</span><span class="mt-1 max-w-full truncate px-3 text-xs">{{ it.videoUrl }}</span></div>
            <div class="space-y-2 p-3">
              <input v-model="it.caption" maxlength="255" placeholder="Légende" aria-label="Légende" class="field !px-2.5 !py-1.5 text-sm" @change="saveCaption(it)" />
              <div class="flex items-center justify-between text-sm">
                <span><button type="button" class="mr-1 rounded border px-2 py-0.5 disabled:opacity-30" :disabled="i === 0" aria-label="Monter" @click="move(i, -1)">↑</button><button type="button" class="rounded border px-2 py-0.5 disabled:opacity-30" :disabled="i === items.length - 1" aria-label="Descendre" @click="move(i, 1)">↓</button></span>
                <button type="button" class="text-red-700 underline" @click="removeItem(it)">Retirer</button>
              </div>
            </div>
          </li>
        </ul>
      </template>
    </section>
    <p v-else class="mt-8 text-sm text-slate-600">Enregistrez l'album pour pouvoir y ajouter des photos et des vidéos.</p>

    <MediaPicker v-if="picker" type="image" @select="pick" @close="picker = null" />
  </div>
</template>
