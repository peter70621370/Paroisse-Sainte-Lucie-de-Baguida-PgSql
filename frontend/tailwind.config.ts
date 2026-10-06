import type { Config } from 'tailwindcss';

// Palette de la paroisse : crème, bleu marine, or. Titres en serif (polices système : rapide, hors-ligne, sans suivi).
export default <Partial<Config>>{
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#1F3A5F', dark: '#162B47', light: '#2C5282' },
        // « gold » : décoration (filets, bordures). « gold-dark » : texte et fonds de boutons (contraste ≥ 4,5:1 avec le blanc et le crème).
        gold: { DEFAULT: '#B8860B', light: '#E9D8A6', dark: '#86610A' },
        cream: { DEFAULT: '#FAF6EC', dark: '#F1EAD7' },
      },
      fontFamily: {
        serif: ['Georgia', 'Cambria', '"Times New Roman"', 'serif'],
      },
    },
  },
};
