// Menu principal du site public. Les pages « /p/xxx » sont créées dans Administration › Pages (slug = xxx).
export type NavItem = { label: string; to?: string; children?: { label: string; to: string }[] };

export const NAV: NavItem[] = [
  { label: 'Accueil', to: '/' },
  {
    label: 'La Paroisse',
    children: [
      { label: 'Le mot du Curé', to: '/p/mot-du-cure' },
      { label: 'Histoire de la paroisse', to: '/p/histoire' },
      { label: 'Vision et mission', to: '/p/vision-mission' },
      { label: 'Personnel pastoral', to: '/personnel' },
    ],
  },
  {
    label: 'Vie spirituelle',
    children: [
      { label: 'Horaires des messes', to: '/horaires' },
      { label: 'Messe en direct', to: '/direct' },
      { label: 'Agenda', to: '/agenda' },
      { label: 'Les sacrements', to: '/p/sacrements' },
      { label: 'Demande de sacrement', to: '/demarches/sacrement' },
      { label: 'Intention de messe', to: '/demarches/intention-de-messe' },
      { label: 'Groupes de prière', to: '/p/groupes-de-priere' },
      { label: 'Homélies', to: '/homelies' },
    ],
  },
  {
    label: 'Catéchèse',
    children: [
      { label: 'Présentation', to: '/p/catechese' },
      { label: 'Inscription au catéchisme', to: '/demarches/catechisme' },
    ],
  },
  { label: 'Jeunesse', to: '/p/jeunesse' },
  {
    label: "S'engager",
    children: [
      { label: 'Bénévolat et ministères', to: '/p/sengager' },
      { label: 'Adhésion à la paroisse', to: '/demarches/adhesion' },
    ],
  },
  {
    label: 'Actualités',
    children: [
      { label: 'Annonces', to: '/actualites' },
      { label: 'Bulletins', to: '/bulletins' },
      { label: 'Galerie', to: '/galerie' },
    ],
  },
  { label: 'Dons', to: '/dons' },
  { label: 'Contact', to: '/contact' },
];

export const weekdayLabel: Record<string, string> = {
  MONDAY: 'Lundi', TUESDAY: 'Mardi', WEDNESDAY: 'Mercredi', THURSDAY: 'Jeudi', FRIDAY: 'Vendredi', SATURDAY: 'Samedi', SUNDAY: 'Dimanche',
};
export const kindLabel: Record<string, string> = { MASS: 'Messe', CONFESSION: 'Confessions', ADORATION: 'Adoration', OTHER: '' };

/** « 06:15 » → « 6h15 » */
export const hm = (t: string) => t.replace(/^0/, '').replace(':', 'h');

/** Affiche une date AAAA-MM-JJ(T…) en « 5 octobre 2026 ». */
export const longDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : '';

export type ScheduleItem = { id: number; weekday: string; time: string; kind: string; language: string | null; location: string | null; notes: string | null };

/** Regroupe les horaires par jour (l'API les renvoie déjà triés du lundi au dimanche). */
export function groupByDay(items: ScheduleItem[]) {
  const days: { weekday: string; label: string; entries: ScheduleItem[] }[] = [];
  for (const it of items) {
    let d = days.find((x) => x.weekday === it.weekday);
    if (!d) days.push((d = { weekday: it.weekday, label: weekdayLabel[it.weekday] ?? it.weekday, entries: [] }));
    d.entries.push(it);
  }
  return days;
}

/** Texte brut d'un contenu HTML, tronqué (pour les aperçus). */
export const excerptOf = (html: string | null | undefined, max = 140) => {
  const t = (html ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return t.length > max ? t.slice(0, max).replace(/\s+\S*$/, '') + '…' : t;
};
