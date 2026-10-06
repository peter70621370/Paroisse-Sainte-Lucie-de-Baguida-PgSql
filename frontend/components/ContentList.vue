<script setup lang="ts">
// Liste générique d'un contenu publiable (pages, annonces, homélies).
type Row = { id: number; title: string; status: 'DRAFT' | 'PUBLISHED'; publishedAt: string | null; updatedAt: string; [k: string]: any };

const props = defineProps<{
  title: string;
  resource: string; // ex. 'pages'  -> /api/admin/pages
  route: string; // ex. '/admin/pages'
  newLabel: string;
  extraLabel?: string;
  extra?: (row: Row) => string;
}>();

const { user } = useAuth();
const canDelete = computed(() => user.value?.role !== 'CONTRIBUTOR');

const page = ref(1);
const status = ref('');
const q = ref('');
const query = computed(() => ({ page: page.value, status: status.value || undefined, q: q.value || undefined }));
const { data, refresh } = await useAdminFetch<{ items: Row[]; total: number; pageSize: number }>(`/api/admin/${props.resource}`, { query, watch: [query] });
const pages = computed(() => Math.max(1, Math.ceil((data.value?.total ?? 0) / (data.value?.pageSize ?? 20))));

const err = ref('');
async function remove(r: Row) {
  if (!confirm(`Supprimer « ${r.title} » définitivement ?`)) return;
  err.value = '';
  try {
    await $fetch(`/api/admin/${props.resource}/${r.id}`, { method: 'DELETE' });
    await refresh();
  } catch (e) {
    err.value = apiError(e);
  }
}

function state(r: Row) {
  if (r.status === 'DRAFT') return { label: 'Brouillon', cls: 'bg-slate-200 text-slate-700' };
  if (r.publishedAt && new Date(r.publishedAt) > new Date()) return { label: 'Programmé', cls: 'bg-blue-100 text-blue-800' };
  return { label: 'Publié', cls: 'bg-green-100 text-green-800' };
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-[#1F3A5F]">{{ title }}</h1>
      <NuxtLink :to="`${route}/new`" class="rounded bg-[#1F3A5F] px-4 py-2 text-sm text-white">{{ newLabel }}</NuxtLink>
    </div>

    <div class="mt-4 flex flex-wrap gap-3">
      <select v-model="status" class="rounded border border-slate-300 px-3 py-2 text-sm" @change="page = 1">
        <option value="">Tous les statuts</option>
        <option value="DRAFT">Brouillons</option>
        <option value="PUBLISHED">Publiés</option>
      </select>
      <input v-model.lazy="q" placeholder="Rechercher un titre…" class="rounded border border-slate-300 px-3 py-2 text-sm" @change="page = 1" />
    </div>

    <p v-if="err" class="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{{ err }}</p>

    <div class="mt-4 overflow-x-auto rounded-xl bg-white shadow">
      <table class="w-full text-left text-sm">
        <thead class="border-b bg-slate-50 text-slate-600">
          <tr>
            <th class="px-4 py-3">Titre</th>
            <th v-if="extraLabel" class="px-4 py-3">{{ extraLabel }}</th>
            <th class="px-4 py-3">Statut</th>
            <th class="px-4 py-3">Modifié le</th>
            <th class="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in data?.items" :key="r.id" class="border-b last:border-0">
            <td class="px-4 py-3 font-medium">
              <NuxtLink :to="`${route}/${r.id}`" class="text-[#1F3A5F] hover:underline">{{ r.title }}</NuxtLink>
            </td>
            <td v-if="extraLabel" class="px-4 py-3 text-slate-600">{{ extra?.(r) }}</td>
            <td class="px-4 py-3"><span :class="['rounded-full px-2 py-0.5 text-xs', state(r).cls]">{{ state(r).label }}</span></td>
            <td class="px-4 py-3 text-slate-600">{{ fmtDate(r.updatedAt) }}</td>
            <td class="whitespace-nowrap px-4 py-3 text-right">
              <NuxtLink :to="`${route}/${r.id}`" class="mr-3 text-[#1F3A5F] underline">Modifier</NuxtLink>
              <button v-if="canDelete" class="text-red-700 underline" @click="remove(r)">Supprimer</button>
            </td>
          </tr>
          <tr v-if="!data?.items.length"><td colspan="5" class="px-4 py-6 text-center text-slate-600">Aucun élément.</td></tr>
        </tbody>
      </table>
    </div>

    <div v-if="pages > 1" class="mt-4 flex items-center gap-3 text-sm">
      <button class="rounded border px-3 py-1 disabled:opacity-40" :disabled="page <= 1" @click="page--">Précédent</button>
      <span>Page {{ page }} / {{ pages }}</span>
      <button class="rounded border px-3 py-1 disabled:opacity-40" :disabled="page >= pages" @click="page++">Suivant</button>
    </div>
  </div>
</template>
