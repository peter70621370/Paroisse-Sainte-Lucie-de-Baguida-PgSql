<script setup lang="ts">
// Petites icônes au trait (dessinées dans le code : aucune dépendance, aucun téléchargement).
const ICONS = {
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  pin: '<path d="M20 10c0 5-5.5 10.2-7.4 11.8a1 1 0 0 1-1.2 0C9.5 20.2 4 15 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-9 5.7a1.9 1.9 0 0 1-2 0L2 7"/>',
  heart: '<path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.500c0 2.300 1.500 4 3 5.500l7 7Z"/>',
  book: '<path d="M12 7v14M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  cross: '<path d="M12 2v20M6 8h12"/>',
  church: '<path d="M12 2v5M10 4h4M7 21V11l5-4 5 4v10M3 21v-6l4-2M21 21v-6l-4-2M2 21h20M10 21v-4a2 2 0 0 1 4 0v4"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4M10 9H8M16 13H8M16 17H8"/>',
  play: '<path d="M6 3l14 9-14 9V3z"/>',
  arrow: '<path d="M5 12h14M12 5l7 7-7 7"/>',
  'chevron-down': '<path d="m6 9 6 6 6-6"/>',
  'chevron-right': '<path d="m9 18 6-6-6-6"/>',
  'chevron-left': '<path d="m15 18-6-6 6-6"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  close: '<path d="M18 6 6 18M6 6l12 12"/>',
  megaphone: '<path d="m3 11 18-5v12L3 14v-3zM11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
  flame: '<path d="M8.500 14.500A2.500 2.500 0 0 0 11 12c0-1.400-.500-2-1-3-1.100-2.100-.200-4 2-6 .500 2.500 2 4.900 4 6.500s3 3.500 3 5.500a7 7 0 1 1-14 0c0-1.200.400-2.300 1-3a2.500 2.500 0 0 0 2.500 2.500z"/>',
  gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7M7.500 8a2.500 2.500 0 0 1 0-5C10 3 12 5.500 12 8c0-2.500 2-5 4.500-5a2.500 2.500 0 0 1 0 5"/>',
  video: '<path d="m16 13 5.200 3.500a.5.5 0 0 0 .8-.4V7.900a.5.5 0 0 0-.8-.4L16 10.500"/><rect x="2" y="6" width="14" height="12" rx="2"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.100-3.100a2 2 0 0 0-2.800 0L6 21"/>',
  mic: '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3ZM19 10v2a7 7 0 0 1-14 0v-2M12 19v3"/>',
  drop: '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.900-3-5.500s-3.500-4-4-6.500c-.5 2.500-2 4.900-4 6.500S5 13 5 15a7 7 0 0 0 7 7z"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  facebook: '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>',
  youtube: '<path d="M2.500 17a24 24 0 0 1 0-10 2 2 0 0 1 1.400-1.400 49.600 49.600 0 0 1 16.200 0A2 2 0 0 1 21.500 7a24 24 0 0 1 0 10 2 2 0 0 1-1.400 1.400 49.600 49.600 0 0 1-16.200 0A2 2 0 0 1 2.500 17"/><path d="m10 15 5-3-5-3z"/>',
  whatsapp: '<path d="M7.900 20A9 9 0 1 0 4 16.100L2 22Z"/>',
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  chart: '<path d="M3 3v18h18M8 17v-5M13 17V8M18 17v-8"/>',
  folder: '<path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.900a2 2 0 0 1-1.700-.9l-.8-1.200A2 2 0 0 0 7.900 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z"/>',
  settings: '<path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h10M18 18h2"/><circle cx="16" cy="6" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="16" cy="18" r="2"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>',
  external: '<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  eye: '<path d="M2 12s3.600-7 10-7 10 7 10 7-3.600 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
  'eye-off': '<path d="M10.700 5.100A9.800 9.800 0 0 1 12 5c6.400 0 10 7 10 7a17 17 0 0 1-2.300 3.200M6.600 6.600A16.600 16.600 0 0 0 2 12s3.600 7 10 7a9.700 9.700 0 0 0 5.400-1.600M9.900 9.900a3 3 0 0 0 4.200 4.200M2 2l20 20"/>',
  hand: '<path d="M11 14h2a2 2 0 1 0 0-4h-3c-.6 0-1.100.2-1.400.6L3 16"/><path d="m7 20 1.600-1.400c.3-.4.800-.6 1.400-.6h4c1.100 0 2.100-.4 2.800-1.200l4.600-4.400a2 2 0 0 0-2.750-2.910l-4.200 3.900M2 15l6 6"/><path d="M19.500 8.500c.7-.7 1.500-1.600 1.500-2.700A2.730 2.730 0 0 0 16 4a2.780 2.780 0 0 0-5 1.800c0 1.200.8 2 1.500 2.800L16 12Z"/>',
} as const;

export type IconName = keyof typeof ICONS;
defineProps<{ name: IconName }>();
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html : tracés fixes définis ci-dessus -->
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" class="inline-block h-[1.15em] w-[1.15em] shrink-0" v-html="ICONS[name]" />
</template>
