<script setup lang="ts">
const props = defineProps<{ error: { statusCode: number; statusMessage?: string } }>();
const notFound = computed(() => props.error.statusCode === 404);
useHead({ title: notFound.value ? t('Page introuvable') : t('Erreur'), meta: [{ name: 'robots', content: 'noindex' }] });
</script>

<template>
  <NuxtLayout>
    <div class="mx-auto max-w-xl px-4 py-24 text-center">
      <p class="font-serif text-8xl font-bold text-gold-dark">{{ error.statusCode }}</p>
      <h1 class="mt-4 font-serif text-3xl font-bold text-navy">{{ notFound ? t(`Page introuvable`) : t(`Une erreur est survenue`) }}</h1>
      <p class="mt-3 text-lg text-slate-600">{{ notFound ? t(`La page que vous cherchez n'existe pas ou n'est plus disponible.`) : t(`Veuillez réessayer dans un instant.`) }}</p>
      <NuxtLink :to="lp('/')" class="btn btn-navy mt-8" @click="clearError()">{{ t(`Retour à l'accueil`) }}</NuxtLink>
    </div>
  </NuxtLayout>
</template>
