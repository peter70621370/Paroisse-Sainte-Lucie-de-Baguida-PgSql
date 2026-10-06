<script setup lang="ts">
usePageSeo('Faire un don', 'Soutenez la vie et les projets de la paroisse par un don en ligne : Mobile Money, carte bancaire ou PayPal.');

type Method = { method: 'MOBILE_MONEY' | 'CARD' | 'PAYPAL'; label: string; currency: 'XOF' | 'EUR'; limits: { min: number; max: number; multipleOf: number } };
type Campaign = { slug: string; title: string; description: string | null; goalAmount: number | null; raised: number; percent: number | null; donors: number };

const route = useRoute();
const { s } = await useSite();
const [{ data: cfg }, { data: camps }, { data: intro }] = await Promise.all([
  useFetch<{ mode: string; methods: Method[] }>('/api/donations/methods'),
  useFetch<{ items: Campaign[] }>('/api/campaigns'),
  useFetch<{ page: { content: string } }>('/api/pages/dons', { key: 'dons-intro', onResponseError: () => {} }),
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

const inputCls = 'w-full rounded border border-slate-300 bg-white px-3 py-2 focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy';
const methodHelp: Record<string, string> = { MOBILE_MONEY: 'Flooz, T-Money… en FCFA', CARD: 'Visa, Mastercard… en FCFA', PAYPAL: 'En euros (€) — idéal depuis l\'étranger' };
</script>

<template>
  <div>
    <PageTitle title="Faire un don" subtitle="Soutenez la vie et les projets de la paroisse" />
    <div class="mx-auto max-w-3xl px-4 py-10">
      <!-- Texte d'introduction modifiable : Administration › Pages (adresse « dons ») -->
      <div v-if="intro?.page?.content" class="rich mb-8" v-html="intro.page.content" />

      <p v-if="cfg?.mode === 'mock'" class="mb-6 rounded border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="note">
        <strong>Mode simulation :</strong> aucun vrai paiement n'est effectué.
      </p>

      <!-- Campagnes en cours -->
      <section v-if="camps?.items.length" class="mb-8">
        <h2 class="font-serif text-2xl font-bold text-navy">Campagnes en cours</h2>
        <ul class="mt-4 space-y-4">
          <li v-for="c in camps.items" :key="c.slug" class="rounded-lg border border-gold/30 bg-white p-5 shadow-sm">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="min-w-0">
                <h3 class="font-serif text-xl font-semibold text-navy">{{ c.title }}</h3>
                <p v-if="c.description" class="mt-1 text-sm text-slate-600">{{ c.description }}</p>
              </div>
              <button type="button" class="shrink-0 rounded border border-navy px-3 py-1.5 text-sm text-navy hover:bg-navy hover:text-white" @click="campaign = c.slug">Soutenir cette campagne</button>
            </div>
            <div v-if="c.goalAmount" class="mt-3">
              <div class="h-3 overflow-hidden rounded-full bg-cream-dark" role="progressbar" :aria-valuenow="c.percent ?? 0" aria-valuemin="0" aria-valuemax="100">
                <div class="h-full rounded-full bg-gold-dark" :style="{ width: `${c.percent ?? 0}%` }" />
              </div>
              <p class="mt-1 text-sm text-slate-600"><strong>{{ formatAmount(c.raised, 'XOF') }}</strong> récoltés sur {{ formatAmount(c.goalAmount, 'XOF') }} ({{ c.percent }} %) · {{ c.donors }} don(s)</p>
            </div>
          </li>
        </ul>
      </section>

      <!-- Aucun moyen de paiement configuré -->
      <div v-if="!methods.length" class="rounded-lg border border-gold/30 bg-white p-6 text-center shadow-sm">
        <p class="font-serif text-xl font-semibold text-navy">Les dons en ligne ouvrent bientôt</p>
        <p class="mt-2 text-slate-600">En attendant, vous pouvez remettre votre don au secrétariat paroissial<span v-if="s['site.phone']"> ou nous appeler au {{ s['site.phone'] }}</span>.</p>
        <NuxtLink to="/contact" class="mt-4 inline-block rounded bg-navy px-5 py-2 text-white">Nous contacter</NuxtLink>
      </div>

      <form v-else class="space-y-6 rounded-lg border border-gold/30 bg-white p-6 shadow-sm" novalidate @submit.prevent="submit">
        <fieldset>
          <legend class="font-serif text-xl font-semibold text-navy">1. Moyen de paiement</legend>
          <div class="mt-3 grid gap-3 sm:grid-cols-3">
            <label v-for="m in methods" :key="m.method" :class="['cursor-pointer rounded-lg border-2 p-3 text-sm', method === m.method ? 'border-gold bg-cream' : 'border-slate-200 hover:border-gold/60']">
              <input v-model="method" type="radio" name="method" :value="m.method" class="sr-only" />
              <span class="block font-semibold text-navy">{{ m.label }}</span>
              <span class="block text-xs text-slate-600">{{ methodHelp[m.method] }}</span>
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend class="font-serif text-xl font-semibold text-navy">2. Montant ({{ currency === 'EUR' ? '€' : 'FCFA' }})</legend>
          <div class="mt-3 flex flex-wrap gap-2">
            <button v-for="p in presets" :key="p" type="button" :class="['rounded border-2 px-4 py-2 font-medium', amount === p && !custom ? 'border-gold bg-gold-dark text-white' : 'border-navy/30 text-navy hover:border-gold']" @click="pickPreset(p)">{{ formatAmount(p, currency) }}</button>
          </div>
          <label class="mt-3 block text-sm">
            <span class="mb-1 block font-medium">Autre montant <span v-if="current" class="font-normal text-slate-600">(min. {{ formatAmount(current.limits.min, currency) }})</span></span>
            <input v-model="custom" inputmode="numeric" :placeholder="currency === 'EUR' ? 'Ex. : 25' : 'Ex. : 7500'" :class="[inputCls, 'max-w-xs']" />
          </label>
          <p v-if="amount" class="mt-2 text-sm text-slate-600">Votre don : <strong>{{ formatAmount(amount, currency) }}</strong></p>
          <p v-if="fieldErrors.amount" class="mt-1 text-sm text-red-700" role="alert">{{ fieldErrors.amount.join(', ') }}</p>
        </fieldset>

        <fieldset v-if="camps?.items.length">
          <legend class="font-serif text-xl font-semibold text-navy">3. Destination</legend>
          <select v-model="campaign" class="mt-3 w-full max-w-md rounded border border-slate-300 bg-white px-3 py-2">
            <option value="">Don libre pour la paroisse</option>
            <option v-for="c in camps.items" :key="c.slug" :value="c.slug">{{ c.title }}</option>
          </select>
        </fieldset>

        <fieldset>
          <legend class="font-serif text-xl font-semibold text-navy">{{ camps?.items.length ? '4' : '3' }}. Vos coordonnées</legend>
          <div class="mt-3 grid gap-4 sm:grid-cols-2">
            <label class="text-sm">
              <span class="mb-1 block font-medium">Nom et prénoms<span v-if="needIdentity" class="text-red-700"> *</span></span>
              <input v-model="form.donorName" autocomplete="name" :class="inputCls" />
              <span v-if="fieldErrors.donorName" class="mt-1 block text-red-700" role="alert">{{ fieldErrors.donorName.join(', ') }}</span>
            </label>
            <label class="text-sm">
              <span class="mb-1 block font-medium">Téléphone<span v-if="needIdentity" class="text-red-700"> *</span></span>
              <input v-model="form.donorPhone" type="tel" autocomplete="tel" placeholder="+228 90 00 00 00" :class="inputCls" />
              <span v-if="fieldErrors.donorPhone" class="mt-1 block text-red-700" role="alert">{{ fieldErrors.donorPhone.join(', ') }}</span>
            </label>
            <label class="text-sm sm:col-span-2">
              <span class="mb-1 block font-medium">E-mail (pour recevoir la confirmation)</span>
              <input v-model="form.donorEmail" type="email" autocomplete="email" :class="inputCls" />
              <span v-if="fieldErrors.donorEmail" class="mt-1 block text-red-700" role="alert">{{ fieldErrors.donorEmail.join(', ') }}</span>
            </label>
            <label class="text-sm sm:col-span-2">
              <span class="mb-1 block font-medium">Un message (facultatif)</span>
              <textarea v-model="form.message" rows="2" maxlength="500" :class="inputCls" />
            </label>
          </div>
        </fieldset>

        <div class="absolute left-[-9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
          <label>Ne pas remplir <input v-model="trap" type="text" name="website" tabindex="-1" autocomplete="off" /></label>
        </div>

        <div>
          <label class="flex items-start gap-2 text-sm">
            <input v-model="consent" type="checkbox" class="mt-1 h-4 w-4" />
            <span>J'accepte que mes informations soient utilisées par la paroisse pour traiter mon don. <NuxtLink to="/p/confidentialite" class="text-navy underline">Politique de confidentialité</NuxtLink></span>
          </label>
          <p v-if="fieldErrors.consent" class="mt-1 text-sm text-red-700" role="alert">{{ fieldErrors.consent.join(', ') }}</p>
        </div>

        <p v-if="generalError" class="rounded bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{{ generalError }}</p>
        <button :disabled="loading" class="w-full rounded bg-gold-dark px-6 py-3 text-lg font-medium text-white hover:bg-gold-dark/90 disabled:opacity-60 sm:w-auto">
          {{ loading ? 'Redirection vers le paiement…' : amount ? `Donner ${formatAmount(amount, currency)}` : 'Donner' }}
        </button>
        <p class="text-xs text-slate-600">Paiement sécurisé : vous serez redirigé vers la page de paiement de notre prestataire. La paroisse ne conserve aucune donnée de carte ni de compte Mobile Money.</p>
      </form>
    </div>
  </div>
</template>
