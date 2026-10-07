<script setup lang="ts">
import type { FormField } from '~/components/PublicForm.vue';
const { name } = await useSite();
usePageSeo('Contact', `Coordonnées de la ${name.value} et formulaire de contact.`);
const fields: FormField[] = [
  { key: 'fullName', label: 'Nom et prénoms', type: 'text', required: true, half: true },
  { key: 'email', label: 'E-mail', type: 'email', required: true, half: true },
  { key: 'phone', label: 'Téléphone (facultatif)', type: 'tel', half: true },
  { key: 'subject', label: 'Objet (facultatif)', type: 'text', half: true },
  { key: 'message', label: 'Votre message', type: 'textarea', required: true },
];
</script>

<template>
  <div>
    <PageTitle title="Nous contacter" subtitle="Le secrétariat paroissial vous accueille" />
    <div class="mx-auto grid max-w-6xl gap-8 px-4 py-12 lg:grid-cols-3">
      <div class="lg:col-span-2">
        <h2 class="mb-4 font-serif text-2xl font-bold text-navy">Écrivez-nous</h2>
        <PublicForm slug="contact" :fields="fields" submit-label="Envoyer le message" success-title="Merci, votre message est envoyé" />
      </div>
      <SideHelp />
    </div>
  </div>
</template>
