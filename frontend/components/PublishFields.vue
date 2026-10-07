<script setup lang="ts">
// Statut + date de publication, communs à tous les contenus publiables.
const status = defineModel<'DRAFT' | 'PUBLISHED'>('status', { required: true });
const publishedAt = defineModel<string>('publishedAt', { required: true });
const { user } = useAuth();
const canPublish = computed(() => user.value?.role !== 'CONTRIBUTOR');
</script>

<template>
  <fieldset class="card grid gap-4 p-5 sm:grid-cols-2">
    <legend class="px-2 font-serif text-base font-bold text-navy">Publication</legend>
    <label class="text-sm">
      <span class="mb-1.5 block font-semibold text-navy">Statut</span>
      <select v-model="status" class="field">
        <option value="DRAFT">Brouillon (non visible)</option>
        <option v-if="canPublish" value="PUBLISHED">Publié</option>
      </select>
    </label>
    <label v-if="canPublish" class="text-sm">
      <span class="mb-1.5 block font-semibold text-navy">Date de publication</span>
      <input v-model="publishedAt" type="datetime-local" class="field" />
      <span class="mt-1 block text-xs text-slate-600">Vide : publié dès l'enregistrement. Date future : publication programmée.</span>
    </label>
    <p v-else class="text-sm text-slate-600">Un éditeur relira et publiera votre brouillon.</p>
  </fieldset>
</template>
