// Contraste des couleurs (WCAG) : garantit un texte lisible quelle que soit la couleur choisie pour une catégorie.
const luminance = (hex: string) => {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
};
/** Couleur de texte lisible (blanc ou foncé) sur le fond donné. */
export const textOn = (bg: string) => (contrast(bg, '#ffffff') >= 4.5 ? '#ffffff' : '#1e293b');
/** La couleur elle-même si elle est lisible sur fond blanc, sinon le bleu marine. */
export const readableOnWhite = (c: string) => (contrast(c, '#ffffff') >= 4.5 ? c : '#1F3A5F');
