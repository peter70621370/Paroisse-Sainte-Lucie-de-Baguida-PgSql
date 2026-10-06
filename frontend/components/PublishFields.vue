<script setup lang="ts">
// Statut + date de publication, communs à tous les contenus publiables.
const status = defineModel<'DRAFT' | 'PUBLISHED'>('status', { required: true });
const publishedAt = defineModel<string>('publishedAt', { required: true });
const { user } = useAuth();
const canPublish = computed(() => user.value?.role !== 'CONTRIBUTOR');
</script>

<template>
  <fieldset class="grid gap-3 rounded-lg border border-slate-200 p-4 sm:grid-cols-2">
    <legend class="px-1 text-sm font-semibold">Publication</legend>
    <label class="text-sm">
      <span class="mb-1 block font-medium">Statut</span>
      <select v-model="status" class="w-full rounded border border-slate-300 px-3 py-2">
        <option value="DRAFT">Brouillon (non visible)</option>
        <option v-if="canPublish" value="PUBLISHED">Publié</option>
      </select>
    </label>
    <label v-if="canPublish" class="text-sm">
      <span class="mb-1 block font-medium">Date de publication</span>
      <input v-model="publishedAt" type="datetime-local" class="w-full rounded border border-slate-300 px-3 py-2" />
      <span class="mt-1 block text-xs text-slate-600">Vide : publié dès l'enregistrement. Date future : publication programmée.</span>
    </label>
    <p v-else class="text-sm text-slate-600">Un éditeur relira et publiera votre brouillon.</p>
  </fieldset>
</template>
