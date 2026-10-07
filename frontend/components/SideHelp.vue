<script setup lang="ts">
// Colonne d'accompagnement des formulaires : étapes de la démarche + coordonnées du secrétariat.
defineProps<{ steps?: string[]; title?: string }>();
const { s, hours } = await useSite();
</script>

<template>
  <aside class="space-y-5">
    <div v-if="steps?.length" class="card p-6">
      <h2 class="font-serif text-xl font-bold text-navy">{{ title || t(`Comment ça se passe ?`) }}</h2>
      <ol class="mt-4 space-y-4">
        <li v-for="(step, i) in steps" :key="i" class="flex gap-3 text-[0.95rem] text-slate-700">
          <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy font-serif text-sm font-bold text-gold-light" aria-hidden="true">{{ i + 1 }}</span>
          <span class="pt-0.5">{{ t(step) }}</span>
        </li>
      </ol>
    </div>
    <div class="bg-pattern rounded-2xl bg-navy p-6 text-white shadow-card">
      <h2 class="font-serif text-xl font-bold">{{ t(`Le secrétariat`) }}</h2>
      <address class="mt-4 space-y-3 text-[0.95rem] not-italic text-white/90">
        <p v-if="s['site.address']" class="flex gap-2.5"><Icon name="pin" class="mt-1 text-gold-light" /><span>{{ s['site.address'] }}</span></p>
        <p v-if="s['site.phone']" class="flex gap-2.5"><Icon name="phone" class="mt-1 text-gold-light" /><a :href="`tel:${s['site.phone'].replace(/\s/g, '')}`" class="underline-offset-4 hover:underline">{{ s['site.phone'] }}</a></p>
        <p v-if="s['site.contactEmail']" class="flex gap-2.5"><Icon name="mail" class="mt-1 text-gold-light" /><a :href="`mailto:${s['site.contactEmail']}`" class="break-all underline-offset-4 hover:underline">{{ s['site.contactEmail'] }}</a></p>
        <p v-if="!s['site.address'] && !s['site.phone'] && !s['site.contactEmail']" class="text-white/75">{{ t(`Les coordonnées seront bientôt publiées.`) }}</p>
      </address>
      <ul v-if="hours.length" class="mt-4 space-y-1.5 border-t border-white/15 pt-4 text-[0.95rem] text-white/90">
        <li v-for="h in hours" :key="h" class="flex gap-2.5"><Icon name="clock" class="mt-1 text-gold-light" /><span>{{ h }}</span></li>
      </ul>
    </div>
  </aside>
</template>
