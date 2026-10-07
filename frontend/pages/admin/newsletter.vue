<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: ['admin', 'admin-staff'] });
useHead({ title: 'Newsletter – Administration', meta: [{ name: 'robots', content: 'noindex' }] });

type Sub = { id: number; email: string; confirmed: boolean; unsubscribedAt: string | null; createdAt: string };
type Issue = { id: number; subject: string; status: string; recipients: number; sentCount: number; createdAt: string; sentAt: string | null };

const { user } = useAuth();
const { data: summary, refresh: refreshSummary } = await useAdminFetch<{ confirmed: number; pending: number; unsubscribed: number }>('/api/admin/subscribers/summary');
const { data: issues, refresh: refreshIssues } = await useAdminFetch<{ items: Issue[] }>('/api/admin/newsletters');

const subject = ref('');
const content = ref('');
const testTo = ref('');
const msg = ref('');
const err = ref('');
const busy = ref(false);

async function sendTest() {
  msg.value = err.value = '';
  try {
    await $fetch('/api/admin/newsletters/test', { method: 'POST', body: { subject: subject.value, content: content.value, to: testTo.value } });
    msg.value = `Message de test envoyé à ${testTo.value}.`;
  } catch (e) { err.value = apiError(e); }
}

let poll: ReturnType<typeof setInterval> | undefined;
async function sendAll() {
  msg.value = err.value = '';
  const n = summary.value?.confirmed ?? 0;
  if (!n) { err.value = 'Aucun abonné confirmé pour le moment.'; return; }
  if (!confirm(`Envoyer « ${subject.value} » à ${n} abonné(s) ? Cette action est définitive.`)) return;
  busy.value = true;
  try {
    await $fetch('/api/admin/newsletters', { method: 'POST', body: { subject: subject.value, content: content.value } });
    msg.value = 'Envoi en cours… la progression s\'affiche dans l\'historique.';
    subject.value = ''; content.value = '';
    await refreshIssues();
    clearInterval(poll);
    poll = setInterval(async () => {
      await refreshIssues();
      if (!issues.value?.items.some((i) => i.status === 'SENDING')) { clearInterval(poll); msg.value = 'Envoi terminé.'; }
    }, 2000);
  } catch (e) { err.value = apiError(e); } finally { busy.value = false; }
}
onBeforeUnmount(() => clearInterval(poll));

// Abonnés
const showSubs = ref(false);
const status = ref('');
const q = ref('');
const { data: subs, refresh: refreshSubs } = await useAdminFetch<{ items: Sub[]; total: number }>('/api/admin/subscribers', { query: computed(() => ({ status: status.value || undefined, q: q.value || undefined })), watch: [status, q] });
const exportUrl = computed(() => `/api/admin/subscribers/export.csv${status.value ? `?status=${status.value}` : ''}`);
const stateOf = (s: Sub) => (s.unsubscribedAt ? 'Désinscrit' : s.confirmed ? 'Confirmé' : 'En attente');
const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '');

async function removeSub(s: Sub) {
  if (!confirm(`Effacer définitivement ${s.email} ?`)) return;
  try { await $fetch(`/api/admin/subscribers/${s.id}`, { method: 'DELETE' }); await Promise.all([refreshSubs(), refreshSummary()]); } catch (e) { err.value = apiError(e); }
}
</script>

<template>
  <div class="max-w-4xl">
    <h1 class="font-serif text-3xl font-bold text-navy">Lettre d'information</h1>

    <div class="mt-4 grid gap-3 sm:grid-cols-3">
      <div class="card p-5"><p class="text-xs text-slate-600">Abonnés confirmés</p><p class="mt-1 font-serif text-3xl font-bold text-navy">{{ summary?.confirmed ?? 0 }}</p></div>
      <div class="card p-5"><p class="text-xs text-slate-600">En attente de confirmation</p><p class="mt-1 font-serif text-3xl font-bold text-navy">{{ summary?.pending ?? 0 }}</p></div>
      <div class="card p-5"><p class="text-xs text-slate-600">Désinscrits</p><p class="mt-1 font-serif text-3xl font-bold text-navy">{{ summary?.unsubscribed ?? 0 }}</p></div>
    </div>

    <section class="mt-6 card p-5">
      <h2 class="font-semibold">Rédiger un message</h2>
      <form class="mt-3 space-y-4" @submit.prevent="sendAll">
        <label class="block text-sm"><span class="mb-1.5 block font-semibold text-navy">Objet</span><input v-model="subject" required maxlength="255" placeholder="Les nouvelles de la paroisse – octobre" class="field" /></label>
        <div class="text-sm"><span class="mb-1.5 block font-semibold text-navy">Message</span><RichEditor v-model="content" /></div>
        <p class="text-xs text-slate-600">Chaque message contient automatiquement le lien de désinscription. Faites d'abord un test sur votre propre adresse.</p>
        <div class="flex flex-wrap items-end gap-3">
          <label class="text-sm"><span class="mb-1.5 block font-semibold text-navy">Envoyer un test à</span><input v-model="testTo" type="email" placeholder="vous@exemple.org" class="field !w-auto" /></label>
          <button type="button" :disabled="!subject || !content || !testTo" class="btn btn-sm btn-outline disabled:opacity-50" @click="sendTest">Envoyer le test</button>
          <button :disabled="busy || !subject || !content" class="btn btn-sm btn-navy ml-auto disabled:opacity-50">Envoyer à {{ summary?.confirmed ?? 0 }} abonné(s)</button>
        </div>
        <p v-if="err" class="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700" role="alert">{{ err }}</p>
        <p v-if="msg" class="rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-800" role="status">{{ msg }}</p>
      </form>
    </section>

    <section class="mt-6 card p-5">
      <h2 class="font-semibold">Messages envoyés</h2>
      <table class="mt-3 w-full text-left text-sm">
        <thead class="border-b text-slate-600"><tr><th class="py-2">Objet</th><th class="py-2">Date</th><th class="py-2">Envoyés</th><th class="py-2">État</th></tr></thead>
        <tbody>
          <tr v-for="i in issues?.items" :key="i.id" class="border-b border-slate-100 transition last:border-0 hover:bg-cream/60">
            <td class="py-2 pr-3 font-medium">{{ i.subject }}</td><td class="py-2 pr-3">{{ fmt(i.createdAt) }}</td><td class="py-2 pr-3">{{ i.sentCount }} / {{ i.recipients }}</td>
            <td class="py-2"><span :class="['rounded-full px-2 py-0.5 text-xs', i.status === 'SENT' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800']">{{ i.status === 'SENT' ? 'Envoyé' : 'En cours' }}</span></td>
          </tr>
          <tr v-if="!issues?.items.length"><td colspan="4" class="py-4 text-center text-slate-600">Aucun message envoyé.</td></tr>
        </tbody>
      </table>
    </section>

    <section class="mt-6 card p-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <button class="font-semibold" :aria-expanded="showSubs" @click="showSubs = !showSubs">{{ showSubs ? '▾' : '▸' }} Abonnés ({{ subs?.total ?? 0 }})</button>
        <a :href="exportUrl" download class="text-sm text-navy underline">Exporter en CSV</a>
      </div>
      <div v-if="showSubs" class="mt-3">
        <div class="flex flex-wrap gap-3">
          <select v-model="status" class="field !w-auto text-sm"><option value="">Tous</option><option value="confirmed">Confirmés</option><option value="pending">En attente</option><option value="unsubscribed">Désinscrits</option></select>
          <input v-model.lazy="q" placeholder="Rechercher une adresse…" class="field !w-auto text-sm" />
        </div>
        <table class="mt-3 w-full text-left text-sm">
          <tbody>
            <tr v-for="s in subs?.items" :key="s.id" class="border-b border-slate-100 transition last:border-0 hover:bg-cream/60">
              <td class="py-2 pr-3">{{ s.email }}</td><td class="py-2 pr-3">{{ stateOf(s) }}</td><td class="py-2 pr-3 text-slate-600">{{ fmt(s.createdAt) }}</td>
              <td class="py-2 text-right"><button v-if="user?.role === 'ADMIN'" class="text-red-700 underline" @click="removeSub(s)">Effacer</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
