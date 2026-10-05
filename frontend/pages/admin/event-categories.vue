<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' });
useHead({ title: 'Catégories d\'événements – Administration', meta: [{ name: 'robots', content: 'noindex' }] });

type C = { id: number; name: string; slug: string; color: string | null };
const { user } = useAuth();
const canWrite = computed(() => user.value?.role !== 'CONTRIBUTOR');
const { data, refresh } = await useAdminFetch<{ items: C[] }>('/api/admin/event-categories', { query: { pageSize: 100 } });

const editingId = ref<number | null>(null);
const form = reactive({ name: '', slug: '', color: '#1F3A5F' });
const slugTouched = ref(false);
const err = ref('');
const msg = ref('');
watch(() => form.name, (n) => { if (!slugTouched.value && !editingId.value) form.slug = slugify(n); });

function reset() { editingId.value = null; slugTouched.value = false; Object.assign(form, { name: '', slug: '', color: '#1F3A5F' }); }
function edit(c: C) { editingId.value = c.id; slugTouched.value = true; Object.assign(form, { name: c.name, slug: c.slug, color: c.color ?? '#1F3A5F' }); err.value = msg.value = ''; }

async function save() {
  err.value = msg.value = '';
  try {
    if (editingId.value) await $fetch(`/api/admin/event-categories/${editingId.value}`, { method: 'PATCH', body: { ...form } });
    else await $fetch('/api/admin/event-categories', { method: 'POST', body: { ...form } });
    msg.value = 'Catégorie enregistrée.';
    reset();
    await refresh();
  } catch (e) {
    err.value = apiError(e);
  }
}

async function remove(c: C) {
  if (!confirm(`Supprimer la catégorie « ${c.name} » ? Les événements concernés n'auront plus de catégorie.`)) return;
  try {
    await $fetch(`/api/admin/event-categories/${c.id}`, { method: 'DELETE' });
    await refresh();
  } catch (e) {
    err.value = apiError(e);
  }
}
</script>

<template>
  <div class="max-w-2xl">
    <NuxtLink to="/admin/events" class="text-sm text-navy underline">← Agenda</NuxtLink>
    <h1 class="mt-1 text-2xl font-bold text-navy">Catégories d'événements</h1>

    <form v-if="canWrite" class="mt-4 grid gap-3 rounded-xl bg-white p-5 shadow sm:grid-cols-3" @submit.prevent="save">
      <label class="text-sm"><span class="mb-1 block font-medium">Nom</span><input v-model="form.name" required maxlength="100" class="w-full rounded border border-slate-300 px-3 py-2" /></label>
      <label class="text-sm"><span class="mb-1 block font-medium">Identifiant</span><input v-model="form.slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" class="w-full rounded border border-slate-300 px-3 py-2" @input="slugTouched = true" /></label>
      <label class="text-sm"><span class="mb-1 block font-medium">Couleur</span><input v-model="form.color" type="color" class="h-10 w-full rounded border border-slate-300" /></label>
      <p v-if="err" class="rounded bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-3" role="alert">{{ err }}</p>
      <p v-if="msg" class="rounded bg-green-50 px-3 py-2 text-sm text-green-800 sm:col-span-3" role="status">{{ msg }}</p>
      <div class="flex gap-2 sm:col-span-3">
        <button class="rounded bg-navy px-4 py-2 text-sm text-white">{{ editingId ? 'Enregistrer' : 'Ajouter' }}</button>
        <button v-if="editingId" type="button" class="rounded border border-slate-300 px-4 py-2 text-sm" @click="reset">Annuler</button>
      </div>
    </form>

    <ul class="mt-6 divide-y rounded-xl bg-white shadow">
      <li v-for="c in data?.items" :key="c.id" class="flex items-center justify-between gap-3 px-4 py-3 text-sm">
        <span class="flex items-center gap-3"><span class="h-4 w-4 rounded-full" :style="{ backgroundColor: c.color ?? '#1F3A5F' }" />{{ c.name }}</span>
        <span v-if="canWrite" class="whitespace-nowrap">
          <button class="mr-3 text-navy underline" @click="edit(c)">Modifier</button>
          <button class="text-red-700 underline" @click="remove(c)">Supprimer</button>
        </span>
      </li>
      <li v-if="!data?.items.length" class="px-4 py-6 text-center text-slate-500">Aucune catégorie.</li>
    </ul>
  </div>
</template>
