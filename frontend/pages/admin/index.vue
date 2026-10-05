<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' });
useHead({ title: 'Administration', meta: [{ name: 'robots', content: 'noindex' }] });

const { user } = useAuth();
const roleLabel = { ADMIN: 'Administrateur', EDITOR: 'Éditeur', CONTRIBUTOR: 'Contributeur' } as const;
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-[#1F3A5F]">Tableau de bord</h1>
    <p class="mt-4">
      Bonjour <strong>{{ user?.firstName }} {{ user?.lastName }}</strong>
      <span class="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">{{ user && roleLabel[user.role] }}</span>
    </p>
    <p class="mt-2 text-slate-500">La gestion des contenus (pages, annonces, bulletins, horaires…) arrive au prochain sprint.</p>
  </div>
</template>
