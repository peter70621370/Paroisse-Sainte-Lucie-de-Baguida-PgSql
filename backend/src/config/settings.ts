// Paramètres modifiables depuis le back-office. `public: true` : exposé sans authentification (pied de page, contact).
export const SETTINGS = {
  'site.name': { public: true, label: 'Nom du site' },
  'site.contactEmail': { public: true, label: 'E-mail de contact' },
  'site.phone': { public: true, label: 'Téléphone' },
  'site.address': { public: true, label: 'Adresse' },
  'social.facebook': { public: true, label: 'Page Facebook (URL)' },
  'social.youtube': { public: true, label: 'Chaîne YouTube (URL)' },
  'social.whatsapp': { public: true, label: 'WhatsApp (URL)' },
} as const;

export type SettingKey = keyof typeof SETTINGS;
export const SETTING_KEYS = Object.keys(SETTINGS) as SettingKey[];
export const PUBLIC_SETTING_KEYS = SETTING_KEYS.filter((k) => SETTINGS[k].public);
