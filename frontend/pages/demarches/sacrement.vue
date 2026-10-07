<script setup lang="ts">
import type { FormField } from '~/components/PublicForm.vue';
usePageSeo('Demande de sacrement', 'Demandez un sacrement : baptême, communion, confirmation, mariage, onction des malades.');
const sacraments = [
  ['BAPTISM', 'Baptême'], ['COMMUNION', 'Première communion'], ['CONFIRMATION', 'Confirmation'],
  ['MARRIAGE', 'Mariage'], ['ANOINTING', 'Onction des malades'], ['OTHER', 'Autre demande'],
].map(([value, label]) => ({ value: value!, label: label! }));
const fields: FormField[] = [
  { key: 'sacrament', label: 'Sacrement demandé', type: 'select', required: true, options: sacraments },
  { key: 'fullName', label: 'Nom et prénoms', type: 'text', required: true },
  { key: 'phone', label: 'Téléphone', type: 'tel', half: true, help: 'Téléphone ou e-mail : l\'un des deux est obligatoire.' },
  { key: 'email', label: 'E-mail', type: 'email', half: true },
  { key: 'preferredDate', label: 'Date souhaitée (facultatif)', type: 'text', placeholder: 'Ex. : fin décembre' },
  { key: 'message', label: 'Précisions (facultatif)', type: 'textarea' },
];
const steps = ['Indiquez le sacrement souhaité et vos coordonnées.', 'Le secrétariat vous recontacte pour fixer un premier rendez-vous avec un prêtre.', 'La préparation commence : rencontres, pièces à fournir et choix de la date.'];
</script>

<template>
  <div>
    <PageTitle title="Demande de sacrement" subtitle="Le secrétariat vous recontactera pour la préparation" />
    <div class="mx-auto grid max-w-6xl gap-8 px-4 py-12 lg:grid-cols-3">
      <div class="lg:col-span-2"><PublicForm slug="sacrament" :fields="fields" submit-label="Envoyer la demande" /></div>
      <SideHelp :steps="steps" />
    </div>
  </div>
</template>
