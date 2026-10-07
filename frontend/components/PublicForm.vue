<script setup lang="ts">
// Formulaire public piloté par la description de ses champs. Anti-spam : champ piège « website » (invisible) + limitation côté serveur.
export type FormField = {
  key: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'textarea' | 'select' | 'date';
  required?: boolean;
  options?: { value: string; label: string }[];
  help?: string;
  placeholder?: string;
  half?: boolean;
};

const props = defineProps<{ slug: string; fields: FormField[]; submitLabel?: string; successTitle?: string; successText?: string }>();

const blank = () => Object.fromEntries(props.fields.map((f) => [f.key, '']));
const values = reactive<Record<string, string>>(blank());
const consent = ref(false);
const trap = ref(''); // champ piège
const loading = ref(false);
const sent = ref(false);
const generalError = ref('');
const fieldErrors = ref<Record<string, string[]>>({});

async function submit() {
  generalError.value = '';
  fieldErrors.value = {};
  loading.value = true;
  try {
    await $fetch(`/api/forms/${props.slug}`, { method: 'POST', body: { ...values, consent: consent.value, website: trap.value } });
    sent.value = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (e: any) {
    if (e?.statusCode === 429 || e?.status === 429) generalError.value = 'Trop de demandes envoyées. Merci de réessayer dans quelques minutes.';
    else if (e?.data?.details) {
      fieldErrors.value = e.data.details;
      generalError.value = 'Merci de corriger les champs signalés.';
    } else generalError.value = e?.data?.error || 'L\'envoi a échoué. Veuillez réessayer.';
  } finally {
    loading.value = false;
  }
}

function again() {
  Object.assign(values, blank());
  consent.value = false;
  sent.value = false;
}

const inputCls = 'field';
</script>

<template>
  <div v-if="sent" class="rounded-2xl border border-green-200 bg-green-50 p-8 text-center" role="status">
    <p class="font-serif text-2xl font-semibold text-green-900">{{ successTitle || 'Merci, votre demande est envoyée' }}</p>
    <p class="mt-2 text-green-900/80">{{ successText || 'Le secrétariat paroissial vous répondra dès que possible.' }}</p>
    <button class="mt-5 rounded border border-green-800 px-4 py-2 text-green-900 hover:bg-green-100" @click="again">Envoyer une autre demande</button>
  </div>

  <form v-else class="card grid gap-5 p-6 sm:grid-cols-2 md:p-8" novalidate @submit.prevent="submit">
    <div v-for="f in fields" :key="f.key" :class="f.half ? '' : 'sm:col-span-2'">
      <label :for="`f-${f.key}`" class="mb-1.5 block text-sm font-semibold text-navy">
        {{ f.label }}<span v-if="f.required" class="text-red-700" aria-hidden="true"> *</span>
      </label>
      <textarea v-if="f.type === 'textarea'" :id="`f-${f.key}`" v-model="values[f.key]" rows="5" :required="f.required" :placeholder="f.placeholder" :class="inputCls" :aria-invalid="!!fieldErrors[f.key]" />
      <select v-else-if="f.type === 'select'" :id="`f-${f.key}`" v-model="values[f.key]" :required="f.required" :class="inputCls" :aria-invalid="!!fieldErrors[f.key]">
        <option value="" disabled>Choisir…</option>
        <option v-for="o in f.options" :key="o.value" :value="o.value">{{ o.label }}</option>
      </select>
      <input v-else :id="`f-${f.key}`" v-model="values[f.key]" :type="f.type" :required="f.required" :placeholder="f.placeholder" :class="inputCls" :aria-invalid="!!fieldErrors[f.key]" />
      <p v-if="f.help" class="mt-1 text-xs text-slate-600">{{ f.help }}</p>
      <p v-if="fieldErrors[f.key]" class="mt-1 text-sm text-red-700" role="alert">{{ fieldErrors[f.key]?.join(', ') }}</p>
    </div>

    <!-- Champ piège : invisible pour les humains, rempli par les robots -->
    <div class="absolute left-[-9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
      <label>Ne pas remplir <input v-model="trap" type="text" name="website" tabindex="-1" autocomplete="off" /></label>
    </div>

    <div class="sm:col-span-2">
      <label class="flex items-start gap-2 text-sm">
        <input v-model="consent" type="checkbox" required class="mt-1 h-4 w-4" />
        <span>J'accepte que ces informations soient utilisées par la paroisse pour traiter ma demande. <NuxtLink to="/p/confidentialite" class="text-navy underline">Politique de confidentialité</NuxtLink></span>
      </label>
      <p v-if="fieldErrors.consent" class="mt-1 text-sm text-red-700" role="alert">{{ fieldErrors.consent.join(', ') }}</p>
    </div>

    <p v-if="generalError" class="rounded bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2" role="alert">{{ generalError }}</p>
    <div class="sm:col-span-2">
      <button :disabled="loading" class="btn btn-navy disabled:opacity-60">{{ loading ? 'Envoi…' : submitLabel || 'Envoyer' }}</button>
    </div>
  </form>
</template>
