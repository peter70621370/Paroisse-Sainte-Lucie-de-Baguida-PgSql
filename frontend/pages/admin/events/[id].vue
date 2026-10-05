<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' });
useHead({ title: 'Événement – Administration', meta: [{ name: 'robots', content: 'noindex' }] });

const route = useRoute();
const isNew = route.params.id === 'new';
const id = isNew ? null : Number(route.params.id);
const { user } = useAuth();
const canPublish = computed(() => user.value?.role !== 'CONTRIBUTOR');

const { data: cats } = await useAdminFetch<{ items: { id: number; name: string }[] }>('/api/admin/event-categories', { query: { pageSize: 100 } });

const form = reactive({ title: '', description: '', location: '', startsAt: '', endsAt: '', allDay: false, categoryId: null as number | null, status: 'DRAFT' as 'DRAFT' | 'PUBLISHED' });

if (id) {
  const { data, error } = await useAdminFetch<{ item: any }>(`/api/admin/events/${id}`);
  if (error.value || !data.value) throw createError({ statusCode: 404, statusMessage: 'Événement introuvable' });
  const e = data.value.item;
  Object.assign(form, {
    title: e.title, description: e.description ?? '', location: e.location ?? '', startsAt: toLocalInput(e.startsAt), endsAt: toLocalInput(e.endsAt),
    allDay: e.allDay, categoryId: e.categoryId, status: e.status,
  });
}

const err = ref('');
const msg = ref('');
const saving = ref(false);

async function save() {
  err.value = msg.value = '';
  saving.value = true;
  const body = { ...form, startsAt: fromLocalInput(form.startsAt), endsAt: fromLocalInput(form.endsAt) };
  try {
    if (id) {
      await $fetch(`/api/admin/events/${id}`, { method: 'PATCH', body });
      msg.value = 'Événement enregistré.';
    } else {
      const res = await $fetch<{ item: { id: number } }>('/api/admin/events', { method: 'POST', body });
      await navigateTo(`/admin/events/${res.item.id}`);
    }
  } catch (e) {
    err.value = apiError(e);
  } finally {
    saving.value = false;
  }
}

async function remove() {
  if (!confirm('Supprimer cet événement définitivement ?')) return;
  try {
    await $fetch(`/api/admin/events/${id}`, { method: 'DELETE' });
    await navigateTo('/admin/events');
  } catch (e) {
    err.value = apiError(e);
  }
}
</script>

<template>
  <div class="max-w-3xl">
    <NuxtLink to="/admin/events" class="text-sm text-navy underline">← Agenda</NuxtLink>
    <h1 class="mt-1 text-2xl font-bold text-navy">{{ isNew ? 'Nouvel événement' : 'Modifier l\'événement' }}</h1>

    <form class="mt-6 space-y-4" @submit.prevent="save">
      <label class="block text-sm">
        <span class="mb-1 block font-medium">Titre</span>
        <input v-model="form.title" required maxlength="255" class="w-full rounded border border-slate-300 px-3 py-2" />
      </label>
      <div class="grid gap-3 sm:grid-cols-2">
        <label class="text-sm">
          <span class="mb-1 block font-medium">Début</span>
          <input v-model="form.startsAt" type="datetime-local" required class="w-full rounded border border-slate-300 px-3 py-2" />
        </label>
        <label class="text-sm">
          <span class="mb-1 block font-medium">Fin (facultatif)</span>
          <input v-model="form.endsAt" type="datetime-local" class="w-full rounded border border-slate-300 px-3 py-2" />
        </label>
        <label class="flex items-center gap-2 text-sm sm:col-span-2"><input v-model="form.allDay" type="checkbox" class="h-4 w-4" /> Toute la journée (l'heure n'est pas affichée)</label>
        <label class="text-sm">
          <span class="mb-1 block font-medium">Lieu</span>
          <input v-model="form.location" maxlength="255" class="w-full rounded border border-slate-300 px-3 py-2" />
        </label>
        <label class="text-sm">
          <span class="mb-1 block font-medium">Catégorie</span>
          <select v-model="form.categoryId" class="w-full rounded border border-slate-300 px-3 py-2">
            <option :value="null">Sans catégorie</option>
            <option v-for="c in cats?.items" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </label>
      </div>
      <label class="block text-sm">
        <span class="mb-1 block font-medium">Description (facultatif)</span>
        <textarea v-model="form.description" rows="5" maxlength="5000" class="w-full rounded border border-slate-300 px-3 py-2" />
      </label>
      <label class="block max-w-xs text-sm">
        <span class="mb-1 block font-medium">Statut</span>
        <select v-model="form.status" class="w-full rounded border border-slate-300 px-3 py-2">
          <option value="DRAFT">Brouillon (non visible)</option>
          <option v-if="canPublish" value="PUBLISHED">Publié</option>
        </select>
      </label>

      <p v-if="err" class="rounded bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{{ err }}</p>
      <p v-if="msg" class="rounded bg-green-50 px-3 py-2 text-sm text-green-800" role="status">{{ msg }}</p>
      <div class="flex items-center gap-3">
        <button :disabled="saving" class="rounded bg-navy px-5 py-2 text-white disabled:opacity-60">{{ saving ? 'Enregistrement…' : 'Enregistrer' }}</button>
        <button v-if="id && canPublish" type="button" class="text-sm text-red-700 underline" @click="remove">Supprimer</button>
      </div>
    </form>
  </div>
</template>
