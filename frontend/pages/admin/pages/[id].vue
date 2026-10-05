<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' });
useHead({ title: 'Page – Administration', meta: [{ name: 'robots', content: 'noindex' }] });

const route = useRoute();
const isNew = route.params.id === 'new';
const id = isNew ? null : Number(route.params.id);
const { user } = useAuth();

const form = reactive({
  title: '', slug: '', locale: 'fr', excerpt: '', content: '', seoTitle: '', seoDescription: '',
  status: 'DRAFT' as 'DRAFT' | 'PUBLISHED', publishedAt: '',
});
const slugTouched = ref(!isNew);

if (id) {
  const { data, error } = await useAdminFetch<{ item: any }>(`/api/admin/pages/${id}`);
  if (error.value || !data.value) throw createError({ statusCode: 404, statusMessage: 'Page introuvable' });
  const p = data.value.item;
  Object.assign(form, {
    title: p.title, slug: p.slug, locale: p.locale, excerpt: p.excerpt ?? '', content: p.content,
    seoTitle: p.seoTitle ?? '', seoDescription: p.seoDescription ?? '', status: p.status, publishedAt: toLocalInput(p.publishedAt),
  });
}
watch(() => form.title, (t) => { if (!slugTouched.value) form.slug = slugify(t); });

const err = ref('');
const msg = ref('');
const saving = ref(false);

async function save() {
  err.value = msg.value = '';
  saving.value = true;
  const body = { ...form, publishedAt: fromLocalInput(form.publishedAt) };
  try {
    if (id) {
      await $fetch(`/api/admin/pages/${id}`, { method: 'PATCH', body });
      msg.value = 'Page enregistrée.';
    } else {
      const res = await $fetch<{ item: { id: number } }>('/api/admin/pages', { method: 'POST', body });
      await navigateTo(`/admin/pages/${res.item.id}`);
    }
  } catch (e) {
    err.value = apiError(e);
  } finally {
    saving.value = false;
  }
}

async function remove() {
  if (!confirm('Supprimer cette page définitivement ?')) return;
  try {
    await $fetch(`/api/admin/pages/${id}`, { method: 'DELETE' });
    await navigateTo('/admin/pages');
  } catch (e) {
    err.value = apiError(e);
  }
}
</script>

<template>
  <div class="max-w-3xl">
    <NuxtLink to="/admin/pages" class="text-sm text-[#1F3A5F] underline">← Pages</NuxtLink>
    <h1 class="mt-1 text-2xl font-bold text-[#1F3A5F]">{{ isNew ? 'Nouvelle page' : 'Modifier la page' }}</h1>

    <form class="mt-6 space-y-4" @submit.prevent="save">
      <label class="block text-sm">
        <span class="mb-1 block font-medium">Titre</span>
        <input v-model="form.title" required maxlength="255" class="w-full rounded border border-slate-300 px-3 py-2" />
      </label>
      <div class="grid gap-3 sm:grid-cols-3">
        <label class="text-sm sm:col-span-2">
          <span class="mb-1 block font-medium">Adresse (slug)</span>
          <input v-model="form.slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" class="w-full rounded border border-slate-300 px-3 py-2" @input="slugTouched = true" />
          <span class="mt-1 block text-xs text-slate-500">Lettres minuscules, chiffres et tirets. Ex. : histoire-de-la-paroisse</span>
        </label>
        <label class="text-sm">
          <span class="mb-1 block font-medium">Langue</span>
          <select v-model="form.locale" class="w-full rounded border border-slate-300 px-3 py-2">
            <option value="fr">Français</option>
            <option value="ee">Éwé</option>
          </select>
        </label>
      </div>
      <label class="block text-sm">
        <span class="mb-1 block font-medium">Résumé (facultatif)</span>
        <textarea v-model="form.excerpt" rows="2" maxlength="500" class="w-full rounded border border-slate-300 px-3 py-2" />
      </label>

      <div class="text-sm">
        <span class="mb-1 block font-medium">Contenu</span>
        <RichEditor v-model="form.content" />
      </div>

      <details class="rounded-lg border border-slate-200 p-4">
        <summary class="cursor-pointer text-sm font-semibold">Référencement (SEO)</summary>
        <div class="mt-3 space-y-3">
          <label class="block text-sm">
            <span class="mb-1 block font-medium">Titre pour Google</span>
            <input v-model="form.seoTitle" maxlength="255" class="w-full rounded border border-slate-300 px-3 py-2" />
          </label>
          <label class="block text-sm">
            <span class="mb-1 block font-medium">Description pour Google</span>
            <textarea v-model="form.seoDescription" rows="2" maxlength="320" class="w-full rounded border border-slate-300 px-3 py-2" />
          </label>
        </div>
      </details>

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
