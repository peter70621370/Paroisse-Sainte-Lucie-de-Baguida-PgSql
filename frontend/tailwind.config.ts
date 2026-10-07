import type { Config } from 'tailwindcss';

// Palette de la paroisse : crème, bleu marine, or. Polices auto-hébergées (aucun appel à un service tiers).
export default <Partial<Config>>{
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#1F3A5F', dark: '#162B47', deep: '#0E1D33', light: '#2C5282' },
        // « gold » : décoration (filets, bordures). « gold-dark » : texte et fonds de boutons (contraste ≥ 4,5:1 avec le blanc et le crème).
        gold: { DEFAULT: '#B8860B', light: '#E9D8A6', dark: '#86610A', deep: '#6E4F08' },
        cream: { DEFAULT: '#FAF6EC', dark: '#F1EAD7' },
      },
      fontFamily: {
        serif: ['"Playfair Display Variable"', 'Georgia', 'Cambria', '"Times New Roman"', 'serif'],
        sans: ['"Source Sans 3 Variable"', 'ui-sans-serif', 'system-ui', '"Segoe UI"', 'Roboto', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(22, 43, 71, 0.05), 0 10px 28px -14px rgba(22, 43, 71, 0.22)',
        lift: '0 2px 4px rgba(22, 43, 71, 0.06), 0 22px 44px -18px rgba(22, 43, 71, 0.32)',
      },
    },
  },
};
