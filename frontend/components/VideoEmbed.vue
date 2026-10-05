<script setup lang="ts">
// Intègre une vidéo YouTube (mode sans cookies) ; pour tout autre lien, affiche un simple lien.
const props = defineProps<{ url: string }>();
const embed = computed(() => {
  const m = props.url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/))([\w-]{11})/);
  return m ? `https://www.youtube-nocookie.com/embed/${m[1]}` : null;
});
</script>

<template>
  <div v-if="embed" class="aspect-video w-full overflow-hidden rounded-lg bg-black">
    <iframe :src="embed" title="Vidéo" class="h-full w-full" loading="lazy" allowfullscreen referrerpolicy="strict-origin-when-cross-origin" />
  </div>
  <a v-else :href="url" target="_blank" rel="noopener noreferrer" class="inline-block rounded border border-navy px-4 py-2 text-navy hover:bg-navy hover:text-white">Voir la vidéo</a>
</template>
