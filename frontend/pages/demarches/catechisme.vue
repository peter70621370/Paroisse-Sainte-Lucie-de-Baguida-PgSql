<script setup lang="ts">
import type { FormField } from '~/components/PublicForm.vue';
usePageSeo('Inscription au catéchisme', 'Inscrivez un enfant ou un adulte à la catéchèse et à la préparation aux sacrements.');
const levels = ['Éveil à la foi', 'Préparation au baptême', 'Première communion', 'Profession de foi', 'Confirmation', 'Adultes'].map((v) => ({ value: v, label: v }));
const fields: FormField[] = [
  { key: 'childName', label: 'Nom et prénoms de l\'enfant (ou du catéchumène)', type: 'text', required: true },
  { key: 'birthDate', label: 'Date de naissance', type: 'date', required: true, half: true },
  { key: 'level', label: 'Niveau demandé', type: 'select', required: true, half: true, options: levels },
  { key: 'parentName', label: 'Nom du parent / responsable', type: 'text', required: true },
  { key: 'phone', label: 'Téléphone', type: 'tel', required: true, half: true },
  { key: 'email', label: 'E-mail (facultatif)', type: 'email', half: true },
  { key: 'message', label: 'Précisions (facultatif)', type: 'textarea' },
];
const steps = ['Remplissez une demande par enfant (ou par adulte).', 'Le responsable de la catéchèse vous confirme le groupe et l’horaire.', 'Apportez un extrait d’acte de naissance et, pour les baptisés, la carte de baptême lors de la première rencontre.'];
</script>

<template>
  <div>
    <PageTitle :title="t(`Inscription au catéchisme`)" :subtitle="t(`Préparation aux sacrements pour enfants et adultes`)" />
    <div class="mx-auto grid max-w-6xl gap-8 px-4 py-12 lg:grid-cols-3">
      <div class="lg:col-span-2"><PublicForm slug="catechism" :fields="fields" :submit-label="t(`Envoyer l'inscription`)" /></div>
      <SideHelp :steps="steps" />
    </div>
  </div>
</template>
