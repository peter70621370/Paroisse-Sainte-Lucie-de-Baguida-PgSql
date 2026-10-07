<script setup lang="ts">
// Visionneuse plein écran : images agrandies et vidéos (chargées au clic). Clavier : ← → Échap.
export type GalleryItem = { id: number; type: 'image' | 'video'; url: string | null; thumbUrl: string | null; videoUrl: string | null; caption: string | null; alt?: string | null };

const props = defineProps<{ items: GalleryItem[]; index: number }>();
const emit = defineEmits<{ close: []; 'update:index': [i: number] }>();

const current = computed(() => props.items[props.index]);
const go = (d: number) => emit('update:index', (props.index + d + props.items.length) % props.items.length);

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close');
  else if (e.key === 'ArrowRight') go(1);
  else if (e.key === 'ArrowLeft') go(-1);
}
const dialog = ref<HTMLElement | null>(null);
onMounted(() => {
  window.addEventListener('keydown', onKey);
  document.body.style.overflow = 'hidden';
  dialog.value?.focus();
});
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey);
  document.body.style.overflow = '';
});
</script>

<template>
  <div ref="dialog" class="fixed inset-0 z-50 flex flex-col bg-black/90 outline-none" role="dialog" aria-modal="true" :aria-label="t(`Visionneuse`)" tabindex="-1" @click.self="emit('close')">
    <div class="flex items-center justify-between px-4 py-3 text-white">
      <span class="text-sm">{{ index + 1 }} / {{ items.length }}</span>
      <button class="rounded px-3 py-1 text-2xl hover:bg-white/10" :aria-label="t(`Fermer`)" @click="emit('close')">✕</button>
    </div>
    <div class="relative flex min-h-0 flex-1 items-center justify-center px-12" @click.self="emit('close')">
      <button v-if="items.length > 1" class="absolute left-2 rounded-full bg-white/10 px-4 py-3 text-2xl text-white hover:bg-white/20" :aria-label="t(`Précédent`)" @click="go(-1)">‹</button>
      <div v-if="current" class="flex max-h-full w-full max-w-5xl flex-col items-center">
        <img v-if="current.type === 'image' && current.url" :key="current.id" :src="current.url" :alt="current.alt || current.caption || ''" class="max-h-[75vh] max-w-full rounded object-contain" />
        <div v-else-if="current.videoUrl" :key="current.id" class="w-full max-w-3xl"><VideoEmbed :url="current.videoUrl" :title="current.caption || t(`Vidéo`)" /></div>
      </div>
      <button v-if="items.length > 1" class="absolute right-2 rounded-full bg-white/10 px-4 py-3 text-2xl text-white hover:bg-white/20" :aria-label="t(`Suivant`)" @click="go(1)">›</button>
    </div>
    <p v-if="current?.caption" class="px-4 py-4 text-center text-white">{{ current.caption }}</p>
  </div>
</template>
