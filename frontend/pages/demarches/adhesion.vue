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
const steps = ['Remplissez le formulaire : il arrive directement au secrétariat.', 'Un membre de l’équipe d’accueil vous recontacte sous quelques jours.', 'Vous êtes orienté vers votre communauté de quartier et les groupes qui vous intéressent.'];
</script>

<template>
  <div>
    <PageTitle title="Adhésion à la paroisse" subtitle="Faites-vous connaître et rejoignez notre communauté" />
    <div class="mx-auto grid max-w-6xl gap-8 px-4 py-12 lg:grid-cols-3">
      <div class="lg:col-span-2"><PublicForm slug="membership" :fields="fields" submit-label="Envoyer mon adhésion" /></div>
      <SideHelp :steps="steps" />
    </div>
  </div>
</template>
