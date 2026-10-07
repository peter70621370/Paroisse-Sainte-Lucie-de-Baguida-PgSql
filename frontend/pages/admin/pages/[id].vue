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
// Adresse publique selon la langue : /p/x (français), /en/p/x (anglais), /p/x?lang=ee (éwé)
const publicPath = computed(() => (form.locale === 'en' ? `/en/p/${form.slug}` : `/p/${form.slug}${form.locale === 'ee' ? '?lang=ee' : ''}`));

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
    <NuxtLink to="/admin/pages" class="text-sm text-navy underline">← Pages</NuxtLink>
    <h1 class="mt-1 font-serif text-3xl font-bold text-navy">{{ isNew ? 'Nouvelle page' : 'Modifier la page' }}</h1>

    <form class="mt-6 space-y-4" @submit.prevent="save">
      <label class="block text-sm">
        <span class="mb-1.5 block font-semibold text-navy">Titre</span>
        <input v-model="form.title" required maxlength="255" class="field" />
      </label>
      <div class="grid gap-3 sm:grid-cols-3">
        <label class="text-sm sm:col-span-2">
          <span class="mb-1.5 block font-semibold text-navy">Adresse (slug)</span>
          <input v-model="form.slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" class="field" @input="slugTouched = true" />
          <span class="mt-1 block text-xs text-slate-600">Lettres minuscules, chiffres et tirets. Ex. : histoire-de-la-paroisse</span>
          <span v-if="form.slug" class="mt-1 block text-xs text-slate-600">
            Adresse publique :
            <a :href="publicPath" target="_blank" rel="noopener" class="font-medium text-navy underline">{{ publicPath }}</a>
            (visible une fois la page publiée)
          </span>
        </label>
        <label class="text-sm">
          <span class="mb-1.5 block font-semibold text-navy">Langue</span>
          <select v-model="form.locale" class="field">
            <option value="fr">Français</option>
            <option value="en">English (anglais)</option>
            <option value="ee">Éwé</option>
          </select>
        </label>
      </div>
      <label class="block text-sm">
        <span class="mb-1.5 block font-semibold text-navy">Résumé (facultatif)</span>
        <textarea v-model="form.excerpt" rows="2" maxlength="500" class="field" />
      </label>

      <div class="text-sm">
        <span class="mb-1.5 block font-semibold text-navy">Contenu</span>
        <RichEditor v-model="form.content" />
      </div>

      <details class="rounded-lg border border-slate-200 p-4">
        <summary class="cursor-pointer text-sm font-semibold">Référencement (SEO)</summary>
        <div class="mt-3 space-y-3">
          <label class="block text-sm">
            <span class="mb-1.5 block font-semibold text-navy">Titre pour Google</span>
            <input v-model="form.seoTitle" maxlength="255" class="field" />
          </label>
          <label class="block text-sm">
            <span class="mb-1.5 block font-semibold text-navy">Description pour Google</span>
            <textarea v-model="form.seoDescription" rows="2" maxlength="320" class="field" />
          </label>
        </div>
      </details>

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
