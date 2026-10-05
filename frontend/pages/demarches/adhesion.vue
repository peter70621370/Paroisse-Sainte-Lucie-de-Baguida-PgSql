<script setup lang="ts">
import type { FormField } from '~/components/PublicForm.vue';
usePageSeo('Adhésion à la paroisse', 'Rejoignez la communauté paroissiale : formulaire d\'adhésion en ligne.');
const fields: FormField[] = [
  { key: 'fullName', label: 'Nom et prénoms', type: 'text', required: true },
  { key: 'phone', label: 'Téléphone', type: 'tel', half: true, help: 'Téléphone ou e-mail : l\'un des deux est obligatoire.' },
  { key: 'email', label: 'E-mail', type: 'email', half: true },
  { key: 'address', label: 'Adresse', type: 'text', half: true },
  { key: 'neighborhood', label: 'Quartier / zone', type: 'text', half: true },
  { key: 'message', label: 'Un mot pour la paroisse (facultatif)', type: 'textarea' },
];
</script>

<template>
  <div>
    <PageTitle title="Adhésion à la paroisse" subtitle="Faites-vous connaître et rejoignez notre communauté" />
    <div class="mx-auto max-w-2xl px-4 py-10"><PublicForm slug="membership" :fields="fields" submit-label="Envoyer mon adhésion" /></div>
  </div>
</template>
