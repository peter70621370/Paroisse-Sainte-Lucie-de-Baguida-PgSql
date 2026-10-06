<script setup lang="ts">
const props = defineProps<{ error: { statusCode: number; statusMessage?: string } }>();
const notFound = computed(() => props.error.statusCode === 404);
useHead({ title: notFound.value ? 'Page introuvable' : 'Erreur', meta: [{ name: 'robots', content: 'noindex' }] });
</script>

<template>
  <NuxtLayout>
    <div class="mx-auto max-w-xl px-4 py-24 text-center">
      <p class="font-serif text-6xl font-bold text-gold-dark">{{ error.statusCode }}</p>
      <h1 class="mt-4 font-serif text-3xl font-bold text-navy">{{ notFound ? 'Page introuvable' : 'Une erreur est survenue' }}</h1>
      <p class="mt-3 text-slate-600">{{ notFound ? 'La page que vous cherchez n\'existe pas ou n\'est plus disponible.' : 'Veuillez réessayer dans un instant.' }}</p>
      <NuxtLink to="/" class="mt-8 inline-block rounded bg-navy px-6 py-3 text-white hover:bg-navy-dark" @click="clearError()">Retour à l'accueil</NuxtLink>
    </div>
  </NuxtLayout>
</template>
