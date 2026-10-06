<script setup lang="ts">
// Vidéo YouTube ou Facebook. RESPECT DE LA VIE PRIVÉE : rien n'est chargé depuis ces services tant que le visiteur n'a pas cliqué.
const props = defineProps<{ url: string; title?: string }>();

const loaded = ref(false);
const media = computed(() => {
  const yt = props.url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/);
  if (yt) return { provider: 'YouTube', src: `https://www.youtube-nocookie.com/embed/${yt[1]}?autoplay=1` };
  if (/^https?:\/\/(www\.|m\.|web\.)?(facebook\.com|fb\.watch)\//i.test(props.url)) {
    return { provider: 'Facebook', src: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(props.url)}&show_text=false&autoplay=true` };
  }
  return null;
});
</script>

<template>
  <div v-if="media">
    <div v-if="loaded" class="aspect-video w-full overflow-hidden rounded-lg bg-black">
      <iframe :src="media.src" :title="title || 'Vidéo'" class="h-full w-full" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin" />
    </div>
    <button v-else type="button" class="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-lg bg-navy-dark p-6 text-center text-white hover:bg-navy" @click="loaded = true">
      <span class="flex h-16 w-16 items-center justify-center rounded-full bg-gold-dark text-3xl" aria-hidden="true">▶</span>
      <span class="font-serif text-xl font-semibold">Regarder la vidéo</span>
      <span class="max-w-md text-xs text-white/70">Au clic, la vidéo est chargée depuis {{ media.provider }}, qui peut déposer ses propres cookies.</span>
    </button>
  </div>
  <a v-else :href="url" target="_blank" rel="noopener noreferrer" class="inline-block rounded border border-navy px-4 py-2 text-navy hover:bg-navy hover:text-white">Voir la vidéo</a>
</template>
