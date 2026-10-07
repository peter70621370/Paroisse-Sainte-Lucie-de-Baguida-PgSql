<script setup lang="ts">
// Bandeau de titre des pages intérieures, avec fil d'Ariane déduit du menu.
defineProps<{ title: string; subtitle?: string | null }>();

const route = useRoute();
const section = computed(() => NAV.find((n) => n.children?.some((c) => c.to === barePath(route.path)))?.label);
</script>

<template>
  <div class="bg-pattern relative overflow-hidden bg-gradient-to-br from-navy-deep via-navy-dark to-navy text-white">
    <div class="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gold/10 blur-3xl" aria-hidden="true" />
    <div class="relative mx-auto max-w-5xl px-4 py-12 text-center md:py-16">
      <nav :aria-label="t(`Fil d'Ariane`)" class="mb-4 flex flex-wrap items-center justify-center gap-1.5 text-sm text-white/75">
        <NuxtLink :to="lp('/')" class="hover:text-gold-light hover:underline">{{ t(`Accueil`) }}</NuxtLink>
        <template v-if="section"><Icon name="chevron-right" class="!h-3.5 !w-3.5" /><span>{{ t(section) }}</span></template>
      </nav>
      <h1 class="font-serif text-3xl font-bold leading-tight md:text-5xl">{{ title }}</h1>
      <div class="mt-5 flex items-center justify-center gap-2" aria-hidden="true">
        <span class="h-px w-12 bg-gold" /><span class="h-2 w-2 rotate-45 bg-gold" /><span class="h-px w-12 bg-gold" />
      </div>
      <p v-if="subtitle" class="mx-auto mt-5 max-w-2xl text-lg text-white/85">{{ subtitle }}</p>
    </div>
    <div class="h-1 bg-gradient-to-r from-gold-dark via-gold-light to-gold-dark" aria-hidden="true" />
  </div>
</template>
