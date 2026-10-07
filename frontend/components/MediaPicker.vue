<script setup lang="ts">
export type PickedMedia = { id: number; filename: string; url: string; thumbUrl: string | null; alt: string | null };

const props = defineProps<{ type: 'image' | 'pdf' }>();
const emit = defineEmits<{ select: [m: PickedMedia]; close: [] }>();

const page = ref(1);
const q = ref('');
const items = ref<PickedMedia[]>([]);
const total = ref(0);
const pageSize = 12;
const loading = ref(false);
const err = ref('');

async function load() {
  loading.value = true;
  try {
    const res = await $fetch<{ items: PickedMedia[]; total: number }>('/api/admin/media', {
      query: { type: props.type, page: page.value, pageSize, q: q.value || undefined },
    });
    items.value = res.items;
    total.value = res.total;
  } catch (e) {
    err.value = apiError(e);
  } finally {
    loading.value = false;
  }
}

async function upload(ev: Event) {
  const input = ev.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  err.value = '';
  const fd = new FormData();
  fd.append('file', file);
  try {
    const res = await $fetch<{ media: PickedMedia }>('/api/admin/media', { method: 'POST', body: fd });
    emit('select', res.media);
  } catch (e) {
    err.value = apiError(e);
  } finally {
    input.value = '';
  }
}

onMounted(load);
const pages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)));
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" @click.self="emit('close')">
    <div class="max-h-[90vh] w-full max-w-3xl overflow-y-auto card p-5-xl">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold text-navy">{{ type === 'image' ? 'Choisir une image' : 'Choisir un PDF' }}</h2>
        <button class="text-slate-600 hover:text-slate-800" aria-label="Fermer" @click="emit('close')">✕</button>
      </div>

      <div class="mt-3 flex flex-wrap items-center gap-3">
        <label class="btn btn-sm btn-navy cursor-pointer">
          Envoyer un nouveau fichier
          <input type="file" class="hidden" :accept="type === 'image' ? 'image/jpeg,image/png,image/webp,image/gif' : 'application/pdf'" @change="upload" />
        </label>
        <input v-model.lazy="q" placeholder="Rechercher…" class="field !w-auto !py-1.5 text-sm" @change="page = 1; load()" />
      </div>

      <p v-if="err" class="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700" role="alert">{{ err }}</p>
      <p v-if="!loading && !items.length" class="mt-6 text-sm text-slate-600">Aucun fichier. Envoyez-en un ci-dessus.</p>

      <ul class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        <li v-for="m in items" :key="m.id">
          <button class="block w-full overflow-hidden rounded-lg border border-slate-200 text-left hover:border-[#1F3A5F]" @click="emit('select', m)">
            <span class="flex h-24 items-center justify-center bg-slate-100">
              <img v-if="m.thumbUrl" :src="m.thumbUrl" :alt="m.alt ?? m.filename" class="h-full w-full object-cover" />
              <span v-else class="rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">PDF</span>
            </span>
            <span class="block truncate p-2 text-xs">{{ m.filename }}</span>
          </button>
        </li>
      </ul>

      <div v-if="pages > 1" class="mt-4 flex items-center gap-3 text-sm">
        <button class="btn btn-sm btn-outline disabled:opacity-40" :disabled="page <= 1" @click="page--; load()">Précédent</button>
        <span>Page {{ page }} / {{ pages }}</span>
        <button class="btn btn-sm btn-outline disabled:opacity-40" :disabled="page >= pages" @click="page++; load()">Suivant</button>
      </div>
    </div>
  </div>
</template>
