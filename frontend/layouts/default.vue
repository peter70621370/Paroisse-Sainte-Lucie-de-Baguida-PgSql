<script setup lang="ts">
// Langue du document (lecteurs d'écran, moteurs de recherche), d'après l'adresse de la page.
const route = useRoute();
useHead({ htmlAttrs: { lang: () => localeOfPath(route.path) } });
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <a href="#contenu" class="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">{{ t(`Aller au contenu`) }}</a>
    <AnnouncementBar />
    <SiteHeader />
    <main id="contenu" class="flex-1">
      <slot />
    </main>
    <SiteFooter />
    <CookieBanner />
  </div>
</template>
