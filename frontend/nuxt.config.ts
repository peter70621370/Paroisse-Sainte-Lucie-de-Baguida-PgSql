
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: false },
  modules: ['@nuxtjs/tailwindcss'],
  // Polices auto-hébergées (aucun appel à Google Fonts : rapide et respectueux de la vie privée).
  css: [
    '@fontsource-variable/playfair-display/wght.css',
    '@fontsource-variable/playfair-display/wght-italic.css',
    '@fontsource-variable/source-sans-3/wght.css',
    '~/assets/css/main.css',
  ],
  runtimeConfig: {
    // Adresse INTERNE du backend (réseau Docker). Surchargeable à l'exécution : NUXT_API_INTERNAL.
    apiInternal: process.env.API_INTERNAL_URL || 'http://localhost:4000',
    public: {
      // Adresse publique du site (liens canoniques, sitemap). Surchargeable : NUXT_PUBLIC_SITE_URL.
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    },
  },
  app: {
    head: {
      htmlAttrs: { lang: 'fr' },
      title: 'Paroisse Sainte Lucie de Baguida',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Site officiel de la Paroisse Sainte Lucie de Baguida' },
      ],
    },
  },
  typescript: { strict: true },
  vite: {
    // Nécessaire pour le rechargement à chaud sur volumes Docker (Windows).
    server: { watch: { usePolling: true } },
  },
});
