<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' });
useHead({ title: 'Annonce – Administration', meta: [{ name: 'robots', content: 'noindex' }] });

const route = useRoute();
const isNew = route.params.id === 'new';
const id = isNew ? null : Number(route.params.id);
const { user } = useAuth();

const form = reactive({ title: '', content: '', titleEn: '', contentEn: '', pinned: false, expiresAt: '', status: 'DRAFT' as 'DRAFT' | 'PUBLISHED', publishedAt: '' });

if (id) {
  const { data, error } = await useAdminFetch<{ item: any }>(`/api/admin/announcements/${id}`);
  if (error.value || !data.value) throw createError({ statusCode: 404, statusMessage: 'Annonce introuvable' });
  const a = data.value.item;
  Object.assign(form, { title: a.title, content: a.content, titleEn: a.titleEn ?? '', contentEn: a.contentEn ?? '', pinned: a.pinned, expiresAt: toLocalInput(a.expiresAt), status: a.status, publishedAt: toLocalInput(a.publishedAt) });
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
    <NuxtLink to="/admin/announcements" class="text-sm text-navy underline">← Annonces</NuxtLink>
    <h1 class="mt-1 font-serif text-3xl font-bold text-navy">{{ isNew ? 'Nouvelle annonce' : 'Modifier l\'annonce' }}</h1>

    <form class="mt-6 space-y-4" @submit.prevent="save">
      <label class="block text-sm">
        <span class="mb-1.5 block font-semibold text-navy">Titre</span>
        <input v-model="form.title" required maxlength="255" class="field" />
      </label>

      <div class="text-sm">
        <span class="mb-1.5 block font-semibold text-navy">Texte</span>
        <RichEditor v-model="form.content" />
      </div>

      <fieldset class="card space-y-4 p-5">
        <legend class="px-2 font-serif text-base font-bold text-navy">Version anglaise</legend>
        <p class="text-xs text-slate-600">Facultatif. Laissé vide, le site anglais affiche le texte français.</p>
        <label class="block text-sm">
          <span class="mb-1.5 block font-semibold text-navy">Titre (anglais)</span>
          <input v-model="form.titleEn" maxlength="255" lang="en" class="field" />
        </label>
        <div class="text-sm">
          <span class="mb-1.5 block font-semibold text-navy">Texte (anglais)</span>
          <RichEditor v-model="form.contentEn" />
        </div>
      </fieldset>

      <div class="grid gap-3 sm:grid-cols-2">
        <label class="flex items-center gap-2 text-sm">
          <input v-model="form.pinned" type="checkbox" class="h-4 w-4" />
          <span>Épingler en haut de la liste</span>
        </label>
        <label class="text-sm">
          <span class="mb-1.5 block font-semibold text-navy">Masquer automatiquement après (facultatif)</span>
          <input v-model="form.expiresAt" type="datetime-local" class="field" />
        </label>
      </div>

      <PublishFields v-model:status="form.status" v-model:published-at="form.publishedAt" />

      <p v-if="err" class="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700" role="alert">{{ err }}</p>
      <p v-if="msg" class="rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-800" role="status">{{ msg }}</p>

      <div class="flex items-center gap-3">
        <button :disabled="saving" class="btn btn-sm btn-navy disabled:opacity-60">{{ saving ? 'Enregistrement…' : 'Enregistrer' }}</button>
        <button v-if="id && user?.role !== 'CONTRIBUTOR'" type="button" class="text-sm text-red-700 underline" @click="remove">Supprimer</button>
      </div>
    </form>
  </div>
</template>
