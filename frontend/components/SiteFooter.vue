<script setup lang="ts">
const { s, name, logo } = await useSite();
const social = computed(() =>
  [
    ['Facebook', s.value['social.facebook']],
    ['YouTube', s.value['social.youtube']],
    ['WhatsApp', s.value['social.whatsapp']],
  ].filter(([, url]) => url) as [string, string][],
);
const year = new Date().getFullYear();
const { set } = useConsent();
</script>

<template>
  <footer class="mt-16 bg-navy-dark text-white/90">
    <div class="border-b border-white/10">
      <div class="mx-auto max-w-6xl px-4 py-6"><div class="max-w-xl"><NewsletterForm /></div></div>
    </div>
    <div class="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-3">
      <div>
        <img :src="logo" width="192" height="48" :alt="`Logo ${name}`" class="mb-3 h-12 w-auto max-w-[240px] rounded bg-cream p-1 object-contain" />
        <p class="font-serif text-lg font-semibold text-gold-light">{{ name }}</p>
      </div>

      <div>
        <h2 class="font-serif text-lg font-semibold text-gold-light">Contact</h2>
        <address class="mt-2 space-y-1 text-sm not-italic">
          <p v-if="s['site.address']">{{ s['site.address'] }}</p>
          <p v-if="s['site.phone']"><a :href="`tel:${s['site.phone'].replace(/\s/g, '')}`" class="hover:underline">{{ s['site.phone'] }}</a></p>
          <p v-if="s['site.contactEmail']"><a :href="`mailto:${s['site.contactEmail']}`" class="hover:underline">{{ s['site.contactEmail'] }}</a></p>
          <p v-if="!s['site.address'] && !s['site.phone'] && !s['site.contactEmail']" class="text-white/60">Coordonnées à renseigner dans l'administration.</p>
        </address>
        <ul v-if="social.length" class="mt-3 flex flex-wrap gap-3 text-sm">
          <li v-for="[label, url] in social" :key="label"><a :href="url" target="_blank" rel="noopener noreferrer" class="underline hover:text-gold-light">{{ label }}</a></li>
        </ul>
      </div>

      <div>
        <h2 class="font-serif text-lg font-semibold text-gold-light">Liens utiles</h2>
        <ul class="mt-2 space-y-1 text-sm">
          <li><NuxtLink to="/horaires" class="hover:underline">Horaires des messes</NuxtLink></li>
          <li><NuxtLink to="/bulletins" class="hover:underline">Bulletins</NuxtLink></li>
          <li><NuxtLink to="/dons" class="hover:underline">Faire un don</NuxtLink></li>
          <li><NuxtLink to="/contact" class="hover:underline">Nous contacter</NuxtLink></li>
        </ul>
      </div>
    </div>
    <div class="border-t border-white/10 px-4 py-4 text-center text-xs text-white/60">
      © {{ year }} {{ name }} ·
      <NuxtLink to="/p/mentions-legales" class="hover:underline">Mentions légales</NuxtLink> ·
      <NuxtLink to="/p/confidentialite" class="hover:underline">Confidentialité</NuxtLink> ·
      <button class="hover:underline" @click="set('unset')">Gérer mes choix</button>
    </div>
  </footer>
</template>
