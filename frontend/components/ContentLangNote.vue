<script setup lang="ts">
// Rappel affiché sur le site anglais : les contenus publiés au fil de l'eau n'existent qu'en français pour l'instant.
</script>

<template>
  <p v-if="loc() !== 'fr'" class="mx-auto mt-6 max-w-4xl px-4 text-center text-sm italic text-slate-600" role="note">
    {{ t(`Certains contenus (annonces, événements, homélies) ne sont publiés qu'en français.`) }}
  </p>
</template>
