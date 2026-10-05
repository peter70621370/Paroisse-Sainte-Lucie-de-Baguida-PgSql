// Paramètres modifiables depuis le back-office (Paramètres du site).
// Tous sont publics : ils servent à construire le site (logo, accueil, pied de page).
export type SettingType = 'text' | 'textarea' | 'image' | 'url';

export const SETTINGS = {
  'site.name': { label: 'Nom du site', type: 'text', group: 'Identité' },
  'site.tagline': { label: 'Slogan (sous le nom)', type: 'text', group: 'Identité' },
  'site.logo': { label: 'Logo', type: 'image', group: 'Identité' },
  'home.heroImage': { label: 'Grande photo de la page d\'accueil', type: 'image', group: 'Page d\'accueil' },
  'home.welcomeTitle': { label: 'Titre de bienvenue', type: 'text', group: 'Page d\'accueil' },
  'home.welcomeText': { label: 'Texte de bienvenue', type: 'textarea', group: 'Page d\'accueil' },
  'live.url': { label: 'Lien de la messe en direct (YouTube ou Facebook)', type: 'url', group: 'Messe en direct' },
  'live.label': { label: 'Intitulé et horaire de la diffusion', type: 'text', group: 'Messe en direct' },
  'site.contactEmail': { label: 'E-mail de contact', type: 'text', group: 'Contact' },
  'site.phone': { label: 'Téléphone', type: 'text', group: 'Contact' },
  'site.address': { label: 'Adresse', type: 'text', group: 'Contact' },
  'social.facebook': { label: 'Page Facebook (URL)', type: 'text', group: 'Réseaux sociaux' },
  'social.youtube': { label: 'Chaîne YouTube (URL)', type: 'text', group: 'Réseaux sociaux' },
  'social.whatsapp': { label: 'WhatsApp (URL)', type: 'text', group: 'Réseaux sociaux' },
} as const satisfies Record<string, { label: string; type: SettingType; group: string }>;

export type SettingKey = keyof typeof SETTINGS;
export const SETTING_KEYS = Object.keys(SETTINGS) as SettingKey[];
export const settingType = (k: SettingKey): SettingType => SETTINGS[k].type;
