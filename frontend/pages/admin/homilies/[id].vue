<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' });
useHead({ title: 'Homélie – Administration', meta: [{ name: 'robots', content: 'noindex' }] });

const route = useRoute();
const isNew = route.params.id === 'new';
const id = isNew ? null : Number(route.params.id);
const { user } = useAuth();

const form = reactive({
  title: '', preacher: '', date: new Date().toISOString().slice(0, 10), content: '', audioUrl: '', videoUrl: '',
  status: 'DRAFT' as 'DRAFT' | 'PUBLISHED', publishedAt: '',
});

if (id) {
  const { data, error } = await useAdminFetch<{ item: any }>(`/api/admin/homilies/${id}`);
  if (error.value || !data.value) throw createError({ statusCode: 404, statusMessage: 'Homélie introuvable' });
  const h = data.value.item;
  Object.assign(form, {
    title: h.title, preacher: h.preacher ?? '', date: dateOnly(h.date), content: h.content ?? '',
    audioUrl: h.audioUrl ?? '', videoUrl: h.videoUrl ?? '', status: h.status, publishedAt: toLocalInput(h.publishedAt),
  });
}

const err = ref('');
const msg = ref('');
const saving = ref(false);

async function save() {
  err.value = msg.value = '';
  saving.value = true;
  const body = { ...form, publishedAt: fromLocalInput(form.publishedAt) };
  try {
    if (id) {
      await $fetch(`/api/admin/homilies/${id}`, { method: 'PATCH', body });
      msg.value = 'Homélie enregistrée.';
    } else {
      const res = await $fetch<{ item: { id: number } }>('/api/admin/homilies', { method: 'POST', body });
      await navigateTo(`/admin/homilies/${res.item.id}`);
    }
  } catch (e) {
    err.value = apiError(e);
  } finally {
    saving.value = false;
  }
}

async function remove() {
  if (!confirm('Supprimer cette homélie définitivement ?')) return;
  try {
    await $fetch(`/api/admin/homilies/${id}`, { method: 'DELETE' });
    await navigateTo('/admin/homilies');
  } catch (e) {
    err.value = apiError(e);
  }
}
</script>

<template>
  <div class="max-w-3xl">
    <NuxtLink to="/admin/homilies" class="text-sm text-navy underline">← Homélies</NuxtLink>
    <h1 class="mt-1 font-serif text-3xl font-bold text-navy">{{ isNew ? 'Nouvelle homélie' : 'Modifier l\'homélie' }}</h1>

    <form class="mt-6 space-y-4" @submit.prevent="save">
      <label class="block text-sm">
        <span class="mb-1.5 block font-semibold text-navy">Titre</span>
        <input v-model="form.title" required maxlength="255" class="field" />
      </label>
      <div class="grid gap-3 sm:grid-cols-2">
        <label class="text-sm">
          <span class="mb-1.5 block font-semibold text-navy">Date</span>
          <input v-model="form.date" type="date" required class="field" />
        </label>
        <label class="text-sm">
          <span class="mb-1.5 block font-semibold text-navy">Prédicateur</span>
          <input v-model="form.preacher" maxlength="150" class="field" />
        </label>
        <label class="text-sm">
          <span class="mb-1.5 block font-semibold text-navy">Vidéo (lien YouTube / Facebook)</span>
          <input v-model="form.videoUrl" type="url" placeholder="https://…" class="field" />
        </label>
        <label class="text-sm">
          <span class="mb-1.5 block font-semibold text-navy">Audio (lien)</span>
          <input v-model="form.audioUrl" type="url" placeholder="https://…" class="field" />
        </label>
      </div>

      <div class="text-sm">
        <span class="mb-1.5 block font-semibold text-navy">Texte (facultatif)</span>
        <RichEditor v-model="form.content" />
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
