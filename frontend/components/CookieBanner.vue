<script setup lang="ts">
// Bandeau d'information et de choix. Le site n'utilise aucun cookie publicitaire : seule une mesure d'audience anonyme est proposée.
const { consent, load, set } = useConsent();
const ready = ref(false);
onMounted(() => {
  load();
  ready.value = true;
});
</script>

<template>
  <div v-if="ready && consent === 'unset'" class="fixed inset-x-0 bottom-0 z-40 border-t-4 border-gold bg-white p-4 shadow-2xl" role="dialog" aria-labelledby="cookie-title" aria-modal="false">
    <div class="mx-auto flex max-w-5xl flex-wrap items-center gap-4">
      <div class="w-full min-w-0 text-sm sm:w-auto sm:flex-1">
        <p id="cookie-title" class="font-serif text-lg font-semibold text-navy">{{ t(`Votre vie privée`) }}</p>
        <p class="mt-1 text-slate-700">
          {{ t(`Ce site n'utilise`) }} <strong>{{ t(`aucun cookie publicitaire`) }}</strong>. {{ t(`Acceptez-vous que nous comptions les visites de façon`) }} <strong>{{ t(`anonyme`) }}</strong>
          {{ t(`(sans cookie, sans conserver votre adresse IP) pour améliorer le site ?`) }}
          <NuxtLink :to="lp('/p/confidentialite')" class="text-navy underline">{{ t(`En savoir plus`) }}</NuxtLink>
        </p>
      </div>
      <div class="flex w-full shrink-0 gap-3 sm:w-auto">
        <button class="flex-1 rounded border border-navy px-5 py-2 font-medium text-navy hover:bg-navy hover:text-white sm:flex-none" @click="set('denied')">{{ t(`Refuser`) }}</button>
        <button class="flex-1 rounded bg-navy px-5 py-2 font-medium text-white hover:bg-navy-dark sm:flex-none" @click="set('granted')">{{ t(`Accepter`) }}</button>
      </div>
    </div>
  </div>
</template>
