<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' });
useHead({ title: 'Campagne – Administration', meta: [{ name: 'robots', content: 'noindex' }] });

const route = useRoute();
const isNew = route.params.id === 'new';
const id = isNew ? null : Number(route.params.id);
const { user } = useAuth();
const canPublish = computed(() => user.value?.role !== 'CONTRIBUTOR');

const form = reactive({ title: '', slug: '', description: '', goalAmount: null as number | null, startsAt: '', endsAt: '', status: 'DRAFT' as 'DRAFT' | 'PUBLISHED' });
const slugTouched = ref(!isNew);

if (id) {
  const { data, error } = await useAdminFetch<{ item: any }>(`/api/admin/campaigns/${id}`);
  if (error.value || !data.value) throw createError({ statusCode: 404, statusMessage: 'Campagne introuvable' });
  const c = data.value.item;
  Object.assign(form, { title: c.title, slug: c.slug, description: c.description ?? '', goalAmount: c.goalAmount, startsAt: toLocalInput(c.startsAt), endsAt: toLocalInput(c.endsAt), status: c.status });
}
watch(() => form.title, (t) => { if (!slugTouched.value) form.slug = slugify(t); });

const err = ref('');
const msg = ref('');
const saving = ref(false);

async function save() {
  err.value = msg.value = '';
  saving.value = true;
  const body = { ...form, goalAmount: form.goalAmount || null, startsAt: fromLocalInput(form.startsAt), endsAt: fromLocalInput(form.endsAt) };
  try {
    if (id) {
      await $fetch(`/api/admin/campaigns/${id}`, { method: 'PATCH', body });
      msg.value = 'Campagne enregistrée.';
    } else {
      const res = await $fetch<{ item: { id: number } }>('/api/admin/campaigns', { method: 'POST', body });
      await navigateTo(`/admin/campaigns/${res.item.id}`);
    }
  } catch (e) {
    err.value = apiError(e);
  } finally {
    saving.value = false;
  }
}

async function remove() {
  if (!confirm('Supprimer cette campagne ? Les dons déjà reçus sont conservés (sans campagne).')) return;
  try {
    await $fetch(`/api/admin/campaigns/${id}`, { method: 'DELETE' });
    await navigateTo('/admin/campaigns');
  } catch (e) {
    err.value = apiError(e);
  }
}
</script>

<template>
  <div class="max-w-2xl">
    <NuxtLink to="/admin/campaigns" class="text-sm text-navy underline">← Campagnes</NuxtLink>
    <h1 class="mt-1 font-serif text-3xl font-bold text-navy">{{ isNew ? 'Nouvelle campagne' : 'Modifier la campagne' }}</h1>

    <form class="mt-6 space-y-4" @submit.prevent="save">
      <label class="block text-sm"><span class="mb-1.5 block font-semibold text-navy">Titre</span><input v-model="form.title" required maxlength="255" placeholder="Construction de la chapelle" class="field" /></label>
      <label class="block text-sm"><span class="mb-1.5 block font-semibold text-navy">Identifiant (adresse)</span><input v-model="form.slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" class="field" @input="slugTouched = true" /></label>
      <label class="block text-sm"><span class="mb-1.5 block font-semibold text-navy">Présentation</span><textarea v-model="form.description" rows="4" maxlength="5000" class="field" /></label>
      <div class="grid gap-3 sm:grid-cols-3">
        <label class="text-sm"><span class="mb-1.5 block font-semibold text-navy">Objectif (FCFA)</span><input v-model.number="form.goalAmount" type="number" min="1" placeholder="Facultatif" class="field" /></label>
        <label class="text-sm"><span class="mb-1.5 block font-semibold text-navy">Début (facultatif)</span><input v-model="form.startsAt" type="datetime-local" class="field" /></label>
        <label class="text-sm"><span class="mb-1.5 block font-semibold text-navy">Fin (facultatif)</span><input v-model="form.endsAt" type="datetime-local" class="field" /></label>
      </div>
      <label class="block max-w-xs text-sm">
        <span class="mb-1.5 block font-semibold text-navy">Statut</span>
        <select v-model="form.status" class="field">
          <option value="DRAFT">Brouillon (non visible)</option>
          <option v-if="canPublish" value="PUBLISHED">Publiée</option>
        </select>
      </label>
      <p class="text-xs text-slate-600">La progression est calculée à partir des dons réussis. Les dons PayPal (euros) sont convertis à la parité fixe 1 € = 655,957 FCFA.</p>

      <p v-if="err" class="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700" role="alert">{{ err }}</p>
      <p v-if="msg" class="rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-800" role="status">{{ msg }}</p>
      <div class="flex items-center gap-3">
        <button :disabled="saving" class="btn btn-sm btn-navy disabled:opacity-60">{{ saving ? 'Enregistrement…' : 'Enregistrer' }}</button>
        <button v-if="id && canPublish" type="button" class="text-sm text-red-700 underline" @click="remove">Supprimer</button>
      </div>
    </form>
  </div>
</template>
