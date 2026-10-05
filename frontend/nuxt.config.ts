// Appels /api/** : proxifiés vers le backend en développement.
// En production, c'est Nginx qui route /api vers le backend (voir deploiement/nginx).
const apiInternal = process.env.API_INTERNAL_URL || 'http://localhost:4000';

export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: false },
  modules: ['@nuxtjs/tailwindcss'],
  css: ['~/assets/css/main.css'],
  routeRules: {
    '/api/**': { proxy: `${apiInternal}/api/**` },
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
