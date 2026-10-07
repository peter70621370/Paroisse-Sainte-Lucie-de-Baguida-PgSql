<script setup lang="ts">
// Titre de section : sur-titre doré, titre serif, ornement (filets + losange).
withDefaults(defineProps<{ title: string; eyebrow?: string; text?: string; light?: boolean; align?: 'center' | 'left' }>(), { align: 'center' });
</script>

<template>
  <div :class="align === 'center' ? 'text-center' : ''">
    <p v-if="eyebrow" :class="['eyebrow', light ? '!text-gold-light' : '']">{{ eyebrow }}</p>
    <h2 :class="['mt-2 font-serif text-3xl font-bold leading-tight md:text-4xl', light ? 'text-white' : 'text-navy']">{{ title }}</h2>
    <div :class="['mt-4 flex items-center gap-2', align === 'center' ? 'justify-center' : '']" aria-hidden="true">
      <span class="h-px w-10 bg-gold" /><span class="h-2 w-2 rotate-45 bg-gold" /><span class="h-px w-10 bg-gold" />
    </div>
    <p v-if="text" :class="['mt-4 max-w-2xl text-lg', align === 'center' ? 'mx-auto' : '', light ? 'text-white/85' : 'text-slate-600']">{{ text }}</p>
  </div>
</template>
