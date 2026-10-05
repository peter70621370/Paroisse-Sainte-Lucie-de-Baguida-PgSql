<script setup lang="ts">
import type { FormField } from '~/components/PublicForm.vue';
usePageSeo('Intention de messe', 'Confiez une intention de prière à la messe : action de grâce, défunt, intention particulière.');
const types = [['THANKSGIVING', 'Action de grâce'], ['DECEASED', 'Défunt(s)'], ['SPECIAL', 'Intention particulière']].map(([value, label]) => ({ value: value!, label: label! }));
const fields: FormField[] = [
  { key: 'fullName', label: 'Nom et prénoms', type: 'text', required: true },
  { key: 'phone', label: 'Téléphone', type: 'tel', half: true, help: 'Téléphone ou e-mail : l\'un des deux est obligatoire.' },
  { key: 'email', label: 'E-mail', type: 'email', half: true },
  { key: 'intentionType', label: 'Type d\'intention', type: 'select', required: true, half: true, options: types },
  { key: 'preferredDate', label: 'Date souhaitée (facultatif)', type: 'date', half: true },
  { key: 'intention', label: 'Intention', type: 'textarea', required: true, placeholder: 'Ex. : Pour le repos de l\'âme de …' },
];
</script>

<template>
  <div>
    <PageTitle title="Intention de messe" subtitle="Confiez vos intentions à la prière de la communauté" />
    <div class="mx-auto max-w-2xl px-4 py-10">
      <PublicForm slug="mass-intention" :fields="fields" submit-label="Envoyer l'intention" success-text="Votre intention a bien été transmise. Le secrétariat vous confirmera la date de la messe." />
    </div>
  </div>
</template>
