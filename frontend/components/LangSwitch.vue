<script setup lang="ts">
// Sélecteur de langue. La même page est ouverte dans l'autre langue (« /horaires » ↔ « /en/horaires »).
// L'éwé est annoncé mais pas encore disponible.
const route = useRoute();
const current = computed(() => localeOfPath(route.path));
const target = (code: Locale) => ({ path: lp(barePath(route.path), code), query: route.query });
</script>

<template>
  <div role="group" :aria-label="t(`Langue du site`)">
  <ul class="flex items-center rounded-full border border-navy/30 bg-white/60 p-0.5 text-xs font-bold">
    <li v-for="l in LOCALES" :key="l.code">
      <span v-if="!l.enabled" class="block cursor-not-allowed rounded-full px-2 py-1.5 text-slate-500 sm:px-2.5" :title="`${l.label} : ${t('bientôt disponible')}`" aria-disabled="true">
        {{ l.short }}<span class="sr-only"> ({{ l.label }} : {{ t(`bientôt disponible`) }})</span>
      </span>
      <NuxtLink
        v-else
        :to="target(l.code)"
        :hreflang="l.code"
        :lang="l.code"
        :aria-label="l.label"
        :aria-current="current === l.code ? 'true' : undefined"
        :class="['block rounded-full px-2 py-1.5 transition sm:px-2.5', current === l.code ? 'bg-navy text-white' : 'text-navy hover:bg-cream-dark']"
      >
        {{ l.short }}
      </NuxtLink>
    </li>
  </ul>
  </div>
</template>
