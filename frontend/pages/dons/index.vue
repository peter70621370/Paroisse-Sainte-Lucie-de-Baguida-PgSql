<script setup lang="ts">
usePageSeo('Faire un don', 'Soutenez la vie et les projets de la paroisse par un don en ligne : Mobile Money, carte bancaire ou PayPal.');

type Method = { method: 'MOBILE_MONEY' | 'CARD' | 'PAYPAL'; label: string; currency: 'XOF' | 'EUR'; limits: { min: number; max: number; multipleOf: number } };
type Campaign = { slug: string; title: string; description: string | null; goalAmount: number | null; raised: number; percent: number | null; donors: number };

const route = useRoute();
const { s } = await useSite();
const [{ data: cfg }, { data: camps }, { data: intro }] = await Promise.all([
  useFetch<{ mode: string; methods: Method[] }>('/api/donations/methods'),
  useFetch<{ items: Campaign[] }>('/api/campaigns'),
  usePageContent('dons'),
]);

const methods = computed(() => cfg.value?.methods ?? []);
const method = ref<Method['method'] | ''>(methods.value[0]?.method ?? '');
const current = computed(() => methods.value.find((m) => m.method === method.value));
const currency = computed(() => current.value?.currency ?? 'XOF');

const presets = computed(() => (currency.value === 'EUR' ? [5, 10, 20, 50] : [1000, 2000, 5000, 10000]));
const amount = ref<number | null>(null);
const custom = ref('');
watch(currency, () => { amount.value = null; custom.value = ''; });
const pickPreset = (n: number) => { amount.value = n; custom.value = ''; };
watch(custom, (v) => { amount.value = v ? Number(v.replace(/\s/g, '')) || null : amount.value; });

const campaign = ref<string>(typeof route.query.campagne === 'string' ? route.query.campagne : '');
const form = reactive({ donorName: '', donorPhone: '', donorEmail: '', message: '' });
const consent = ref(false);
const trap = ref('');
const loading = ref(false);
const generalError = ref('');
const fieldErrors = ref<Record<string, string[]>>({});
const needIdentity = computed(() => currency.value === 'XOF');

async function submit() {
  generalError.value = '';
  fieldErrors.value = {};
  if (!amount.value) {
    fieldErrors.value = { amount: ['Choisissez ou saisissez un montant'] };
    return;
  }
  loading.value = true;
  try {
    const res = await $fetch<{ redirectUrl: string }>('/api/donations', {
      method: 'POST',
      body: { amount: amount.value, method: method.value, ...form, campaign: campaign.value, consent: consent.value, website: trap.value },
    });
    window.location.href = res.redirectUrl; // page de paiement du prestataire
  } catch (e: any) {
    loading.value = false;
    if (e?.data?.details) {
      fieldErrors.value = e.data.details;
      generalError.value = 'Merci de corriger les champs signalés.';
    } else generalError.value = e?.statusCode === 429 ? 'Trop de tentatives. Réessayez dans quelques minutes.' : e?.data?.error || 'Impossible de démarrer le paiement. Réessayez.';
  }
}

const inputCls = 'field';
const methodHelp: Record<string, string> = { MOBILE_MONEY: 'Flooz, T-Money… en FCFA', CARD: 'Visa, Mastercard… en FCFA', PAYPAL: 'En euros (€) — idéal depuis l\'étranger' };
</script>

<template>
  <div>
    <PageTitle :title="t(`Faire un don`)" :subtitle="t(`Soutenez la vie et les projets de la paroisse`)" />
    <div class="mx-auto max-w-4xl px-4 py-12">
      <!-- Texte d'introduction modifiable : Administration › Pages (adresse « dons ») -->
      <div v-if="intro?.content" class="rich mb-8 text-center text-lg" v-html="intro.content" />

      <p v-if="cfg?.mode === 'mock'" class="mb-8 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="note">
        <strong>{{ t(`Mode simulation`) }} :</strong> {{ t(`aucun vrai paiement n'est effectué.`) }}
      </p>

      <!-- Campagnes en cours -->
      <section v-if="camps?.items.length" class="mb-10">
        <h2 class="font-serif text-2xl font-bold text-navy md:text-3xl">{{ t(`Campagnes en cours`) }}</h2>
        <ul class="mt-5 grid gap-5 md:grid-cols-2">
          <li v-for="c in camps.items" :key="c.slug" :class="['card flex flex-col p-6', campaign === c.slug ? 'ring-2 ring-gold' : '']">
            <h3 class="font-serif text-xl font-bold leading-snug text-navy">{{ c.title }}</h3>
            <p v-if="c.description" class="mt-2 text-[0.95rem] text-slate-600">{{ c.description }}</p>
            <div v-if="c.goalAmount" class="mt-auto pt-5">
              <div class="h-3 overflow-hidden rounded-full bg-cream-dark" role="progressbar" :aria-valuenow="c.percent ?? 0" aria-valuemin="0" aria-valuemax="100" :aria-label="t(`Progression de la collecte : {titre}`, { titre: c.title })">
                <div class="h-full rounded-full bg-gradient-to-r from-gold-dark to-gold" :style="{ width: `${c.percent ?? 0}%` }" />
              </div>
              <p class="mt-2 text-sm text-slate-600"><strong class="text-navy">{{ formatAmount(c.raised, 'XOF') }}</strong> {{ t(`récoltés sur`) }} {{ formatAmount(c.goalAmount, 'XOF') }} ({{ c.percent }} %) · {{ c.donors }} {{ t(`don(s)`) }}</p>
            </div>
            <button type="button" :class="['btn btn-sm mt-5 self-start', campaign === c.slug ? 'btn-gold' : 'btn-outline']" @click="campaign = c.slug"><Icon :name="campaign === c.slug ? 'check' : 'heart'" />{{ campaign === c.slug ? t(`Campagne choisie`) : t(`Soutenir cette campagne`) }}</button>
          </li>
        </ul>
      </section>

      <!-- Aucun moyen de paiement configuré -->
      <div v-if="!methods.length" class="card p-8 text-center">
        <p class="font-serif text-xl font-semibold text-navy">{{ t(`Les dons en ligne ouvrent bientôt`) }}</p>
        <p class="mt-2 text-slate-600">{{ t(`En attendant, vous pouvez remettre votre don au secrétariat paroissial`) }}<span v-if="s['site.phone']"> {{ t(`ou nous appeler au`) }} {{ s['site.phone'] }}</span>.</p>
        <NuxtLink :to="lp('/contact')" class="btn btn-navy mt-5">{{ t(`Nous contacter`) }}</NuxtLink>
      </div>

      <form v-else class="card space-y-8 p-6 md:p-9" novalidate @submit.prevent="submit">
        <fieldset>
          <legend class="font-serif text-xl font-bold text-navy">1. {{ t(`Moyen de paiement`) }}</legend>
          <div class="mt-3 grid gap-3 sm:grid-cols-3">
            <label v-for="m in methods" :key="m.method" :class="['cursor-pointer rounded-xl border-2 p-4 text-sm transition', method === m.method ? 'border-gold bg-cream shadow-sm' : 'border-slate-200 hover:border-gold/60']">
              <input v-model="method" type="radio" name="method" :value="m.method" class="sr-only" />
              <span class="block font-semibold text-navy">{{ t(m.label) }}</span>
              <span class="block text-xs text-slate-600">{{ t(methodHelp[m.method]) }}</span>
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend class="font-serif text-xl font-bold text-navy">2. {{ t(`Montant`) }} ({{ currency === 'EUR' ? '€' : 'FCFA' }})</legend>
          <div class="mt-3 flex flex-wrap gap-2">
            <button v-for="p in presets" :key="p" type="button" :class="['rounded-full border-2 px-5 py-2.5 font-semibold transition', amount === p && !custom ? 'border-gold-dark bg-gold-dark text-white' : 'border-navy/30 text-navy hover:border-gold']" @click="pickPreset(p)">{{ formatAmount(p, currency) }}</button>
          </div>
          <label class="mt-3 block text-sm">
            <span class="mb-1 block font-medium">{{ t(`Autre montant`) }} <span v-if="current" class="font-normal text-slate-600">{{ t(`(min.`) }} {{ formatAmount(current.limits.min, currency) }})</span></span>
            <input v-model="custom" inputmode="numeric" :placeholder="currency === 'EUR' ? t(`Ex. : 25`) : t(`Ex. : 7500`)" :class="[inputCls, 'max-w-xs']" />
          </label>
          <p v-if="amount" class="mt-2 text-sm text-slate-600">{{ t(`Votre don`) }} : <strong>{{ formatAmount(amount, currency) }}</strong></p>
          <p v-if="fieldErrors.amount" class="mt-1 text-sm text-red-700" role="alert">{{ fieldErrors.amount.map((m) => t(m)).join(', ') }}</p>
        </fieldset>

        <fieldset v-if="camps?.items.length">
          <legend class="font-serif text-xl font-bold text-navy">3. {{ t(`Destination`) }}</legend>
          <select v-model="campaign" :aria-label="t(`Destination du don`)" class="field mt-3 max-w-md">
            <option value="">{{ t(`Don libre pour la paroisse`) }}</option>
            <option v-for="c in camps.items" :key="c.slug" :value="c.slug">{{ c.title }}</option>
          </select>
        </fieldset>

        <fieldset>
          <legend class="font-serif text-xl font-bold text-navy">{{ camps?.items.length ? '4' : '3' }}. {{ t(`Vos coordonnées`) }}</legend>
          <div class="mt-3 grid gap-4 sm:grid-cols-2">
            <label class="text-sm">
              <span class="mb-1 block font-medium">{{ t(`Nom et prénoms`) }}<span v-if="needIdentity" class="text-red-700"> *</span></span>
              <input v-model="form.donorName" autocomplete="name" :class="inputCls" />
              <span v-if="fieldErrors.donorName" class="mt-1 block text-red-700" role="alert">{{ fieldErrors.donorName.map((m) => t(m)).join(', ') }}</span>
            </label>
            <label class="text-sm">
              <span class="mb-1 block font-medium">{{ t(`Téléphone`) }}<span v-if="needIdentity" class="text-red-700"> *</span></span>
              <input v-model="form.donorPhone" type="tel" autocomplete="tel" placeholder="+228 90 00 00 00" :class="inputCls" />
              <span v-if="fieldErrors.donorPhone" class="mt-1 block text-red-700" role="alert">{{ fieldErrors.donorPhone.map((m) => t(m)).join(', ') }}</span>
            </label>
            <label class="text-sm sm:col-span-2">
              <span class="mb-1 block font-medium">{{ t(`E-mail (pour recevoir la confirmation)`) }}</span>
              <input v-model="form.donorEmail" type="email" autocomplete="email" :class="inputCls" />
              <span v-if="fieldErrors.donorEmail" class="mt-1 block text-red-700" role="alert">{{ fieldErrors.donorEmail.map((m) => t(m)).join(', ') }}</span>
            </label>
            <label class="text-sm sm:col-span-2">
              <span class="mb-1 block font-medium">{{ t(`Un message (facultatif)`) }}</span>
              <textarea v-model="form.message" rows="2" maxlength="500" :class="inputCls" />
            </label>
          </div>
        </fieldset>

        <div class="absolute left-[-9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
          <label>{{ t(`Ne pas remplir`) }} <input v-model="trap" type="text" name="website" tabindex="-1" autocomplete="off" /></label>
        </div>

        <div>
          <label class="flex items-start gap-2 text-sm">
            <input v-model="consent" type="checkbox" class="mt-1 h-4 w-4" />
            <span>{{ t(`J'accepte que mes informations soient utilisées par la paroisse pour traiter mon don.`) }} <NuxtLink :to="lp('/p/confidentialite')" class="text-navy underline">{{ t(`Politique de confidentialité`) }}</NuxtLink></span>
          </label>
          <p v-if="fieldErrors.consent" class="mt-1 text-sm text-red-700" role="alert">{{ fieldErrors.consent.map((m) => t(m)).join(', ') }}</p>
        </div>

        <p v-if="generalError" class="rounded bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{{ t(generalError) }}</p>
        <button :disabled="loading" class="btn btn-gold w-full px-8 py-3.5 text-lg disabled:opacity-60 sm:w-auto">
          {{ loading ? t(`Redirection vers le paiement…`) : amount ? t(`Donner {montant}`, { montant: formatAmount(amount, currency) }) : t(`Donner`) }}
        </button>
        <p class="text-xs text-slate-600">{{ t(`Paiement sécurisé : vous serez redirigé vers la page de paiement de notre prestataire. La paroisse ne conserve aucune donnée de carte ni de compte Mobile Money.`) }}</p>
      </form>
    </div>
  </div>
</template>
