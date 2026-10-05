<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' });
useHead({ title: 'Annonce – Administration', meta: [{ name: 'robots', content: 'noindex' }] });

const route = useRoute();
const isNew = route.params.id === 'new';
const id = isNew ? null : Number(route.params.id);
const { user } = useAuth();

const form = reactive({ title: '', content: '', pinned: false, expiresAt: '', status: 'DRAFT' as 'DRAFT' | 'PUBLISHED', publishedAt: '' });

if (id) {
  const { data, error } = await useAdminFetch<{ item: any }>(`/api/admin/announcements/${id}`);
  if (error.value || !data.value) throw createError({ statusCode: 404, statusMessage: 'Annonce introuvable' });
  const a = data.value.item;
  Object.assign(form, { title: a.title, content: a.content, pinned: a.pinned, expiresAt: toLocalInput(a.expiresAt), status: a.status, publishedAt: toLocalInput(a.publishedAt) });
}

const err = ref('');
const msg = ref('');
const saving = ref(false);

async function save() {
  err.value = msg.value = '';
  saving.value = true;
  const body = { ...form, publishedAt: fromLocalInput(form.publishedAt), expiresAt: fromLocalInput(form.expiresAt) };
  try {
    if (id) {
      await $fetch(`/api/admin/announcements/${id}`, { method: 'PATCH', body });
      msg.value = 'Annonce enregistrée.';
    } else {
      const res = await $fetch<{ item: { id: number } }>('/api/admin/announcements', { method: 'POST', body });
      await navigateTo(`/admin/announcements/${res.item.id}`);
    }
  } catch (e) {
    err.value = apiError(e);
  } finally {
    saving.value = false;
  }
}

async function remove() {
  if (!confirm('Supprimer cette annonce définitivement ?')) return;
  try {
    await $fetch(`/api/admin/announcements/${id}`, { method: 'DELETE' });
    await navigateTo('/admin/announcements');
  } catch (e) {
    err.value = apiError(e);
  }
}
</script>

<template>
  <div class="max-w-3xl">
    <NuxtLink to="/admin/announcements" class="text-sm text-[#1F3A5F] underline">← Annonces</NuxtLink>
    <h1 class="mt-1 text-2xl font-bold text-[#1F3A5F]">{{ isNew ? 'Nouvelle annonce' : 'Modifier l\'annonce' }}</h1>

    <form class="mt-6 space-y-4" @submit.prevent="save">
      <label class="block text-sm">
        <span class="mb-1 block font-medium">Titre</span>
        <input v-model="form.title" required maxlength="255" class="w-full rounded border border-slate-300 px-3 py-2" />
      </label>

      <div class="text-sm">
        <span class="mb-1 block font-medium">Texte</span>
        <RichEditor v-model="form.content" />
      </div>

      <div class="grid gap-3 sm:grid-cols-2">
        <label class="flex items-center gap-2 text-sm">
          <input v-model="form.pinned" type="checkbox" class="h-4 w-4" />
          <span>Épingler en haut de la liste</span>
        </label>
        <label class="text-sm">
          <span class="mb-1 block font-medium">Masquer automatiquement après (facultatif)</span>
          <input v-model="form.expiresAt" type="datetime-local" class="w-full rounded border border-slate-300 px-3 py-2" />
        </label>
      </div>

      <PublishFields v-model:status="form.status" v-model:published-at="form.publishedAt" />

      <p v-if="err" class="rounded bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{{ err }}</p>
      <p v-if="msg" class="rounded bg-green-50 px-3 py-2 text-sm text-green-800" role="status">{{ msg }}</p>

      <div class="flex items-center gap-3">
        <button :disabled="saving" class="rounded bg-[#1F3A5F] px-5 py-2 text-white disabled:opacity-60">{{ saving ? 'Enregistrement…' : 'Enregistrer' }}</button>
        <button v-if="id && user?.role !== 'CONTRIBUTOR'" type="button" class="text-sm text-red-700 underline" @click="remove">Supprimer</button>
      </div>
    </form>
  </div>
</template>
