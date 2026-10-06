<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' });
useHead({ title: 'Médiathèque – Administration', meta: [{ name: 'robots', content: 'noindex' }] });

type M = { id: number; filename: string; url: string; thumbUrl: string | null; mimeType: string; size: number; alt: string | null };
type List = { total: number; page: number; pageSize: number; items: M[] };

const { user } = useAuth();
const canManage = computed(() => user.value?.role === 'ADMIN' || user.value?.role === 'EDITOR');

const type = ref<'' | 'image' | 'pdf'>('');
const q = ref('');
const page = ref(1);
const query = computed(() => ({ page: page.value, type: type.value || undefined, q: q.value || undefined }));

const { data, refresh } = await useFetch<List>('/api/admin/media', { query, headers: useRequestHeaders(['cookie']), watch: [query] });

const err = ref('');
const msg = ref('');
const uploading = ref(false);
const pages = computed(() => Math.max(1, Math.ceil((data.value?.total ?? 0) / (data.value?.pageSize ?? 24))));

async function upload(ev: Event) {
  const input = ev.target as HTMLInputElement;
  const files = Array.from(input.files ?? []);
  err.value = msg.value = '';
  uploading.value = true;
  let ok = 0;
  for (const file of files) {
    const fd = new FormData();
    fd.append('file', file);
    try {
      await $fetch('/api/admin/media', { method: 'POST', body: fd });
      ok++;
    } catch (e) {
      err.value = `${file.name} : ${apiError(e)}`;
    }
  }
  uploading.value = false;
  input.value = '';
  if (ok) msg.value = `${ok} fichier(s) envoyé(s).`;
  page.value = 1;
  await refresh();
}

async function remove(m: M) {
  if (!confirm(`Supprimer « ${m.filename} » définitivement ?`)) return;
  err.value = msg.value = '';
  try {
    await $fetch(`/api/admin/media/${m.id}`, { method: 'DELETE' });
    await refresh();
  } catch (e) {
    err.value = apiError(e);
  }
}

async function editAlt(m: M) {
  const alt = prompt('Texte alternatif (description de l\'image) :', m.alt ?? '');
  if (alt === null) return;
  try {
    await $fetch(`/api/admin/media/${m.id}`, { method: 'PATCH', body: { alt } });
    await refresh();
  } catch (e) {
    err.value = apiError(e);
  }
}

async function copy(m: M) {
  const full = location.origin + m.url;
  try {
    await navigator.clipboard.writeText(full);
    msg.value = 'Lien copié.';
  } catch {
    prompt('Copiez le lien :', full);
  }
}

const size = (n: number) => (n > 1048576 ? (n / 1048576).toFixed(1) + ' Mo' : Math.ceil(n / 1024) + ' Ko');
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-[#1F3A5F]">Médiathèque</h1>
    <p class="mt-1 text-sm text-slate-600">Images (JPG, PNG, WebP, GIF : redimensionnées et optimisées automatiquement) et PDF. 10 Mo maximum par fichier.</p>

    <div class="mt-4 flex flex-wrap items-center gap-3">
      <label class="cursor-pointer rounded bg-[#1F3A5F] px-4 py-2 text-sm text-white">
        {{ uploading ? 'Envoi…' : 'Ajouter des fichiers' }}
        <input type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif,application/pdf" class="hidden" :disabled="uploading" @change="upload" />
      </label>
      <select v-model="type" class="rounded border border-slate-300 px-3 py-2 text-sm" @change="page = 1">
        <option value="">Tous les types</option>
        <option value="image">Images</option>
        <option value="pdf">PDF</option>
      </select>
      <input v-model.lazy="q" placeholder="Rechercher un nom…" class="rounded border border-slate-300 px-3 py-2 text-sm" @change="page = 1" />
    </div>

    <p v-if="err" class="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{{ err }}</p>
    <p v-if="msg" class="mt-4 rounded bg-green-50 px-3 py-2 text-sm text-green-800" role="status">{{ msg }}</p>

    <p v-if="!data?.items.length" class="mt-8 text-slate-600">Aucun fichier.</p>

    <ul class="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      <li v-for="m in data?.items" :key="m.id" class="overflow-hidden rounded-xl bg-white shadow">
        <a :href="m.url" target="_blank" rel="noopener" class="flex h-32 items-center justify-center bg-slate-100">
          <img v-if="m.thumbUrl" :src="m.thumbUrl" :alt="m.alt ?? m.filename" class="h-full w-full object-cover" loading="lazy" />
          <span v-else class="rounded bg-red-100 px-3 py-1 text-sm font-semibold text-red-700">PDF</span>
        </a>
        <div class="space-y-1 p-3 text-xs">
          <p class="truncate font-medium" :title="m.filename">{{ m.filename }}</p>
          <p class="text-slate-600">{{ size(m.size) }}</p>
          <div class="flex flex-wrap gap-x-3 pt-1 text-[#1F3A5F]">
            <button class="underline" @click="copy(m)">Copier le lien</button>
            <button v-if="canManage && m.thumbUrl" class="underline" @click="editAlt(m)">Texte alt</button>
            <button v-if="canManage" class="text-red-700 underline" @click="remove(m)">Supprimer</button>
          </div>
        </div>
      </li>
    </ul>

    <div v-if="pages > 1" class="mt-6 flex items-center gap-3 text-sm">
      <button class="rounded border px-3 py-1 disabled:opacity-40" :disabled="page <= 1" @click="page--">Précédent</button>
      <span>Page {{ page }} / {{ pages }}</span>
      <button class="rounded border px-3 py-1 disabled:opacity-40" :disabled="page >= pages" @click="page++">Suivant</button>
    </div>
  </div>
</template>
