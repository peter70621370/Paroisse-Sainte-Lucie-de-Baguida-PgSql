<script setup lang="ts">
import type { FormField } from '~/components/PublicForm.vue';
const { s, name } = await useSite();
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
    <div class="mx-auto grid max-w-5xl gap-8 px-4 py-10 md:grid-cols-5">
      <aside class="md:col-span-2">
        <div class="rounded-lg border border-gold/30 bg-white p-5 shadow-sm">
          <h2 class="font-serif text-xl font-semibold text-navy">Coordonnées</h2>
          <address class="mt-3 space-y-3 text-sm not-italic">
            <p v-if="s['site.address']"><span class="block text-xs font-semibold uppercase tracking-wide text-gold">Adresse</span>{{ s['site.address'] }}</p>
            <p v-if="s['site.phone']"><span class="block text-xs font-semibold uppercase tracking-wide text-gold">Téléphone</span><a :href="`tel:${s['site.phone'].replace(/\s/g, '')}`" class="text-navy underline">{{ s['site.phone'] }}</a></p>
            <p v-if="s['site.contactEmail']"><span class="block text-xs font-semibold uppercase tracking-wide text-gold">E-mail</span><a :href="`mailto:${s['site.contactEmail']}`" class="text-navy underline">{{ s['site.contactEmail'] }}</a></p>
            <p v-if="!s['site.address'] && !s['site.phone'] && !s['site.contactEmail']" class="text-slate-500">Les coordonnées seront bientôt publiées.</p>
          </address>
        </div>
      </aside>
      <div class="md:col-span-3"><PublicForm slug="contact" :fields="fields" submit-label="Envoyer le message" success-title="Merci, votre message est envoyé" /></div>
    </div>
  </div>
</template>
