<script setup lang="ts">
// Page temporaire du sprint 0 : vérifie la chaîne frontend -> backend -> base de données.
const { data: api, error } = await useFetch<{ status: string; database: string }>('/api/health/ready');
</script>

<template>
  <main class="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-6 px-4 text-center">
    <h1 class="text-3xl font-bold text-[#1F3A5F]">Paroisse Sainte Lucie de Baguida</h1>
    <p class="text-slate-600">Site en construction.</p>
    <p class="rounded-full px-4 py-1 text-sm" :class="api?.database === 'up' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'">
      API : {{ error ? 'indisponible' : api?.status }} · Base : {{ api?.database ?? 'inconnue' }}
    </p>
  </main>
</template>
