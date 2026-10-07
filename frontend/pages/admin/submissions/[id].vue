<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: ['admin', 'admin-staff'] });
useHead({ title: 'Demande – Administration', meta: [{ name: 'robots', content: 'noindex' }] });

const route = useRoute();
const id = Number(route.params.id);
const { user } = useAuth();

type Detail = {
  id: number; typeLabel: string; status: 'NEW' | 'PROCESSED' | 'ARCHIVED'; fullName: string | null; email: string | null; phone: string | null;
  createdAt: string; handledAt: string | null; handledBy: string | null; details: { key: string; label: string; value: string }[];
};
const { data, error, refresh } = await useAdminFetch<{ item: Detail }>(`/api/admin/submissions/${id}`);
if (error.value || !data.value) throw createError({ statusCode: 404, statusMessage: 'Demande introuvable' });
const s = computed(() => data.value!.item);

const statusLabel = { NEW: 'Nouvelle', PROCESSED: 'Traitée', ARCHIVED: 'Archivée' } as const;
const fmt = (iso: string) => new Date(iso).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' });
const err = ref('');

async function mark(to: Detail['status']) {
  err.value = '';
  try {
    await $fetch(`/api/admin/submissions/${id}`, { method: 'PATCH', body: { status: to } });
    await refresh();
    await refreshNuxtData('submissions-summary');
  } catch (e) {
    err.value = apiError(e);
  }
}

async function remove() {
  if (!confirm('Supprimer définitivement cette demande ?')) return;
  try {
    await $fetch(`/api/admin/submissions/${id}`, { method: 'DELETE' });
    await refreshNuxtData('submissions-summary');
    await navigateTo('/admin/submissions');
  } catch (e) {
    err.value = apiError(e);
  }
}
</script>

<template>
  <div class="max-w-2xl">
    <NuxtLink to="/admin/submissions" class="text-sm text-navy underline">← Demandes reçues</NuxtLink>
    <h1 class="mt-1 font-serif text-3xl font-bold text-navy">{{ s.typeLabel }}</h1>
    <p class="text-sm text-slate-600">Reçue le {{ fmt(s.createdAt) }} · {{ statusLabel[s.status] }}<span v-if="s.handledBy"> par {{ s.handledBy }} ({{ s.handledAt && fmt(s.handledAt) }})</span></p>

    <dl class="mt-5 space-y-4 card p-6">
      <div v-for="d in s.details" :key="d.key">
        <dt class="text-xs font-semibold uppercase tracking-wide text-gold-dark">{{ d.label }}</dt>
        <dd class="mt-0.5 whitespace-pre-line">
          <a v-if="d.key === 'email'" :href="`mailto:${d.value}`" class="text-navy underline">{{ d.value }}</a>
          <a v-else-if="d.key === 'phone'" :href="`tel:${d.value.replace(/\s/g, '')}`" class="text-navy underline">{{ d.value }}</a>
          <template v-else>{{ d.value }}</template>
        </dd>
      </div>
    </dl>

    <p v-if="err" class="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700" role="alert">{{ err }}</p>
    <div class="mt-5 flex flex-wrap items-center gap-3">
      <a v-if="s.email" :href="`mailto:${s.email}`" class="btn btn-sm btn-navy">Répondre par e-mail</a>
      <button v-if="s.status !== 'PROCESSED'" class="btn btn-sm border border-green-800 text-green-900 hover:bg-green-50" @click="mark('PROCESSED')">Marquer comme traitée</button>
      <button v-if="s.status !== 'ARCHIVED'" class="btn btn-sm btn-outline" @click="mark('ARCHIVED')">Archiver</button>
      <button v-if="s.status !== 'NEW'" class="btn btn-sm border border-amber-600 text-amber-800 hover:bg-amber-50" @click="mark('NEW')">Remettre à « nouvelle »</button>
      <button v-if="user?.role === 'ADMIN'" class="ml-auto text-sm text-red-700 underline" @click="remove">Supprimer</button>
    </div>
  </div>
</template>
