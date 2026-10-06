
// En-têtes de sécurité (production uniquement : le mode développement a besoin de scripts inline pour le rechargement à chaud).
// CSP : aucune ressource tierce sauf les lecteurs vidéo (YouTube sans cookies, Facebook), chargés seulement au clic.
const isProd = process.env.NODE_ENV === 'production';
const securityHeaders = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'", // Nuxt injecte sa configuration en ligne
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-src https://www.youtube-nocookie.com https://www.facebook.com",
    "media-src 'self' https:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
  ].join('; '),
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
};

export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: false },
  modules: ['@nuxtjs/tailwindcss'],
  css: ['~/assets/css/main.css'],
  routeRules: isProd ? { '/**': { headers: securityHeaders } } : {},
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
