<script setup lang="ts">
defineProps<{ title: string; subtitle?: string | null }>();
</script>

<template>
  <div class="border-b border-gold/30 bg-cream-dark">
    <div class="mx-auto max-w-4xl px-4 py-10 text-center">
      <h1 class="font-serif text-3xl font-bold text-navy md:text-4xl">{{ title }}</h1>
      <div class="mx-auto mt-3 h-0.5 w-16 bg-gold-dark" />
      <p v-if="subtitle" class="mx-auto mt-4 max-w-2xl text-slate-600">{{ subtitle }}</p>
    </div>
  </div>
</template>
