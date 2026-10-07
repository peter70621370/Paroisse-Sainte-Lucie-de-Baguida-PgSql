<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: ['admin', 'admin-role'] });
useHead({ title: 'Utilisateurs – Administration', meta: [{ name: 'robots', content: 'noindex' }] });

type Role = 'ADMIN' | 'EDITOR' | 'CONTRIBUTOR';
type U = { id: number; email: string; firstName: string; lastName: string; role: Role; active: boolean; lastLoginAt: string | null };

const { user: me } = useAuth();
const roleLabel: Record<Role, string> = { ADMIN: 'Administrateur', EDITOR: 'Éditeur', CONTRIBUTOR: 'Contributeur' };

const { data, refresh } = await useFetch<{ users: U[] }>('/api/admin/users', { headers: useRequestHeaders(['cookie']) });

const err = ref('');
const msg = ref('');

// Formulaire (création ou édition)
const editing = ref<U | null>(null);
const showForm = ref(false);
const form = reactive({ email: '', firstName: '', lastName: '', role: 'EDITOR' as Role, password: '' });

function openCreate() {
  editing.value = null;
  Object.assign(form, { email: '', firstName: '', lastName: '', role: 'EDITOR', password: '' });
  showForm.value = true;
  err.value = msg.value = '';
}
function openEdit(u: U) {
  editing.value = u;
  Object.assign(form, { email: u.email, firstName: u.firstName, lastName: u.lastName, role: u.role, password: '' });
  showForm.value = true;
  err.value = msg.value = '';
}

async function save() {
  err.value = msg.value = '';
  try {
    if (editing.value) {
      const body: Record<string, unknown> = { firstName: form.firstName, lastName: form.lastName, role: form.role };
      if (form.password) body.password = form.password;
      await $fetch(`/api/admin/users/${editing.value.id}`, { method: 'PATCH', body });
      msg.value = 'Utilisateur modifié.';
    } else {
      await $fetch('/api/admin/users', { method: 'POST', body: { ...form } });
      msg.value = 'Utilisateur créé.';
    }
    showForm.value = false;
    await refresh();
  } catch (e) {
    err.value = apiError(e);
  }
}

async function toggleActive(u: U) {
  err.value = msg.value = '';
  try {
    await $fetch(`/api/admin/users/${u.id}`, { method: 'PATCH', body: { active: !u.active } });
    await refresh();
  } catch (e) {
    err.value = apiError(e);
  }
}

const fmt = (d: string | null) => (d ? new Date(d).toLocaleString('fr-FR') : 'Jamais');
</script>

<template>
  <div>
    <div class="flex items-center justify-between">
      <h1 class="font-serif text-3xl font-bold text-navy">Utilisateurs</h1>
      <button class="btn btn-sm btn-navy" @click="openCreate">Nouvel utilisateur</button>
    </div>

    <p v-if="err" class="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700" role="alert">{{ err }}</p>
    <p v-if="msg" class="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-800" role="status">{{ msg }}</p>

    <form v-if="showForm" class="mt-4 grid max-w-2xl gap-3 card p-5 sm:grid-cols-2" @submit.prevent="save">
      <h2 class="font-semibold sm:col-span-2">{{ editing ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur' }}</h2>
      <label class="text-sm sm:col-span-2">
        <span class="mb-1.5 block font-semibold text-navy">E-mail</span>
        <input v-model="form.email" type="email" required :disabled="!!editing" class="field disabled:bg-slate-100" />
      </label>
      <label class="text-sm">
        <span class="mb-1.5 block font-semibold text-navy">Prénom</span>
        <input v-model="form.firstName" required class="field" />
      </label>
      <label class="text-sm">
        <span class="mb-1.5 block font-semibold text-navy">Nom</span>
        <input v-model="form.lastName" required class="field" />
      </label>
      <label class="text-sm">
        <span class="mb-1.5 block font-semibold text-navy">Rôle</span>
        <select v-model="form.role" :disabled="editing?.id === me?.id" class="field">
          <option v-for="(label, r) in roleLabel" :key="r" :value="r">{{ label }}</option>
        </select>
      </label>
      <label class="text-sm">
        <span class="mb-1.5 block font-semibold text-navy">{{ editing ? 'Nouveau mot de passe (facultatif)' : 'Mot de passe (10 caractères min.)' }}</span>
        <input v-model="form.password" type="password" :required="!editing" minlength="10" autocomplete="new-password" class="field" />
      </label>
      <div class="flex gap-2 sm:col-span-2">
        <button class="btn btn-sm btn-navy">Enregistrer</button>
        <button type="button" class="btn btn-sm btn-outline" @click="showForm = false">Annuler</button>
      </div>
    </form>

    <div class="mt-6 card overflow-x-auto">
      <table class="w-full text-left text-sm">
        <thead class="border-b border-gold/20 bg-cream-dark/60 text-xs uppercase tracking-wider text-slate-600">
          <tr>
            <th class="px-4 py-3">Nom</th>
            <th class="px-4 py-3">E-mail</th>
            <th class="px-4 py-3">Rôle</th>
            <th class="px-4 py-3">Dernière connexion</th>
            <th class="px-4 py-3">Statut</th>
            <th class="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in data?.users" :key="u.id" class="border-b border-slate-100 transition last:border-0 hover:bg-cream/60">
            <td class="px-4 py-3">{{ u.firstName }} {{ u.lastName }}</td>
            <td class="px-4 py-3">{{ u.email }}</td>
            <td class="px-4 py-3">{{ roleLabel[u.role] }}</td>
            <td class="px-4 py-3">{{ fmt(u.lastLoginAt) }}</td>
            <td class="px-4 py-3">
              <span :class="['rounded-full px-2 py-0.5 text-xs', u.active ? 'bg-green-100 text-green-800' : 'bg-slate-200 text-slate-600']">
                {{ u.active ? 'Actif' : 'Désactivé' }}
              </span>
            </td>
            <td class="whitespace-nowrap px-4 py-3 text-right">
              <button class="mr-3 text-navy underline" @click="openEdit(u)">Modifier</button>
              <button v-if="u.id !== me?.id" class="text-slate-600 underline" @click="toggleActive(u)">
                {{ u.active ? 'Désactiver' : 'Réactiver' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
