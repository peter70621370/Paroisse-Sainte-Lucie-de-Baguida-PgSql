<script setup lang="ts">
// Pastille « jour / mois » (dates d'événements, d'annonces, d'homélies). Date AAAA-MM-JJ ou ISO, lue à l'heure de la paroisse.
const props = defineProps<{ date: string; tone?: 'navy' | 'gold' }>();
const d = computed(() => new Date(`${dayKey(props.date)}T00:00:00Z`));
const day = computed(() => d.value.getUTCDate());
const month = computed(() => d.value.toLocaleDateString('fr-FR', { month: 'short', timeZone: 'UTC' }).replace('.', ''));
</script>

<template>
  <div :class="['flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl text-white', tone === 'gold' ? 'bg-gold-dark' : 'bg-navy']" aria-hidden="true">
    <span class="font-serif text-2xl font-bold leading-none">{{ day }}</span>
    <span class="mt-1 text-[0.7rem] font-semibold uppercase tracking-widest text-white/90">{{ month }}</span>
  </div>
</template>
