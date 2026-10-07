<script setup lang="ts">
const { s, name, tagline, customLogo, hours, social } = await useSite();
const year = new Date().getFullYear();
const { set } = useConsent();
const links = [
  ['/horaires', 'Horaires des messes'],
  ['/agenda', 'Agenda paroissial'],
  ['/actualites', 'Annonces'],
  ['/bulletins', 'Bulletins'],
  ['/homelies', 'Homélies'],
  ['/dons', 'Faire un don'],
  ['/contact', 'Nous contacter'],
] as const;
</script>

<template>
  <footer class="mt-20 bg-navy-deep text-white/85">
    <!-- Lettre d'information -->
    <div class="bg-pattern border-b border-white/10 bg-navy-dark">
      <div class="mx-auto grid max-w-6xl items-center gap-6 px-4 py-10 md:grid-cols-2">
        <div>
          <p class="eyebrow !text-gold-light">Lettre d'information</p>
          <p class="mt-2 font-serif text-2xl font-bold text-white md:text-3xl">Restez proches de la paroisse</p>
          <p class="mt-2 text-white/80">Annonces, temps forts et bulletin : l'essentiel, directement dans votre boîte e-mail.</p>
        </div>
        <NewsletterForm />
      </div>
    </div>

    <div class="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <img v-if="customLogo" :src="customLogo" width="192" height="48" :alt="`Logo ${name}`" class="mb-4 h-14 w-auto max-w-[240px] rounded-lg bg-cream p-1.5 object-contain" />
        <img v-else :src="PLACEHOLDERS.emblem" width="64" height="64" alt="" class="mb-4 h-16 w-16" />
        <p class="font-serif text-xl font-bold text-white">{{ name }}</p>
        <p v-if="tagline" class="mt-2 text-sm italic text-white/75">{{ tagline }}</p>
        <ul v-if="social.length" class="mt-5 flex gap-3">
          <li v-for="[icon, label, url] in social" :key="label">
            <a :href="url" target="_blank" rel="noopener noreferrer" :aria-label="label" class="flex h-10 w-10 items-center justify-center rounded-full border border-white/25 text-lg text-white transition hover:border-gold-light hover:bg-gold-dark"><Icon :name="icon" /></a>
          </li>
        </ul>
      </div>

      <div>
        <h2 class="font-serif text-lg font-semibold text-gold-light">Contact</h2>
        <address class="mt-4 space-y-3 text-[0.95rem] not-italic">
          <p v-if="s['site.address']" class="flex gap-2.5"><Icon name="pin" class="mt-1 text-gold-light" /><span>{{ s['site.address'] }}</span></p>
          <p v-if="s['site.phone']" class="flex gap-2.5"><Icon name="phone" class="mt-1 text-gold-light" /><a :href="`tel:${s['site.phone'].replace(/\s/g, '')}`" class="hover:text-gold-light hover:underline">{{ s['site.phone'] }}</a></p>
          <p v-if="s['site.contactEmail']" class="flex gap-2.5"><Icon name="mail" class="mt-1 text-gold-light" /><a :href="`mailto:${s['site.contactEmail']}`" class="break-all hover:text-gold-light hover:underline">{{ s['site.contactEmail'] }}</a></p>
          <p v-if="!s['site.address'] && !s['site.phone'] && !s['site.contactEmail']" class="text-white/70">Coordonnées à renseigner dans l'administration.</p>
        </address>
      </div>

      <div>
        <h2 class="font-serif text-lg font-semibold text-gold-light">Secrétariat</h2>
        <ul v-if="hours.length" class="mt-4 space-y-2 text-[0.95rem]">
          <li v-for="h in hours" :key="h" class="flex gap-2.5"><Icon name="clock" class="mt-1 text-gold-light" /><span>{{ h }}</span></li>
        </ul>
        <p v-else class="mt-4 text-[0.95rem] text-white/70">Horaires d'ouverture à venir.</p>
        <NuxtLink to="/contact" class="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-gold-light hover:underline">Nous écrire <Icon name="arrow" /></NuxtLink>
      </div>

      <div>
        <h2 class="font-serif text-lg font-semibold text-gold-light">Liens utiles</h2>
        <ul class="mt-4 space-y-2 text-[0.95rem]">
          <li v-for="[to, label] in links" :key="to"><NuxtLink :to="to" class="hover:text-gold-light hover:underline">{{ label }}</NuxtLink></li>
        </ul>
      </div>
    </div>

    <div class="border-t border-white/10 px-4 py-5 text-center text-sm text-white/70">
      © {{ year }} {{ name }} ·
      <NuxtLink to="/p/mentions-legales" class="hover:text-white hover:underline">Mentions légales</NuxtLink> ·
      <NuxtLink to="/p/confidentialite" class="hover:text-white hover:underline">Confidentialité</NuxtLink> ·
      <button class="hover:text-white hover:underline" @click="set('unset')">Gérer mes choix</button>
    </div>
  </footer>
</template>
