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
</script>

<template>
  <div>
    <PageTitle title="Demande de sacrement" subtitle="Le secrétariat vous recontactera pour la préparation" />
    <div class="mx-auto max-w-2xl px-4 py-10"><PublicForm slug="sacrament" :fields="fields" submit-label="Envoyer la demande" /></div>
  </div>
</template>
