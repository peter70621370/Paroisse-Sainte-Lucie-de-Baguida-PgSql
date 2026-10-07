<script setup lang="ts">
definePageMeta({ layout: false });
useHead({ title: 'Connexion – Administration', meta: [{ name: 'robots', content: 'noindex' }] });

const { user, login } = useAuth();
if (user.value) await navigateTo('/admin');

const email = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);
const lit = ref(true); // le cierge (Lucie : « lumière ») éclaire la pièce ; on peut le souffler / le rallumer
const showPassword = ref(false);

async function submit() {
  error.value = '';
  loading.value = true;
  try {
    await login(email.value, password.value);
    await navigateTo('/admin');
  } catch (e: any) {
    error.value =
      e?.statusCode === 429
        ? 'Trop de tentatives. Réessayez dans une minute.'
        : e?.data?.error || 'Connexion impossible.';
  } finally {
    loading.value = false;
  }
}

const motes = [
  { left: '38%', top: '50%', delay: '0s' },
  { left: '56%', top: '34%', delay: '1.4s' },
  { left: '30%', top: '40%', delay: '2.8s' },
  { left: '62%', top: '56%', delay: '4.2s' },
];
</script>

<template>
  <main :class="['login relative flex min-h-screen items-center justify-center overflow-hidden bg-[#070d1a] px-5 py-12', lit ? 'is-lit' : '']">
    <!-- Lueur de la pièce : apparaît quand le cierge est allumé -->
    <div class="glow pointer-events-none absolute inset-0" aria-hidden="true" />

    <div class="relative z-10 grid w-full max-w-[940px] items-center gap-6 md:grid-cols-[0.85fr_1fr]">
      <!-- Le cierge -->
      <div class="relative flex min-h-[220px] flex-col items-center justify-end md:min-h-[440px]">
        <div class="pointer-events-none absolute inset-0" aria-hidden="true">
          <span v-for="(m, i) in motes" :key="i" class="mote absolute h-[3px] w-[3px] rounded-full bg-[#f6e7b4]" :style="{ left: m.left, top: m.top, animationDelay: m.delay }" />
        </div>

        <button type="button" class="relative z-10 flex flex-col items-center rounded-xl !outline-offset-[10px]" :aria-pressed="lit" aria-label="Allumer ou éteindre le cierge" @click="lit = !lit">
          <svg viewBox="0 0 160 240" class="h-auto w-28 overflow-visible md:w-40">
            <!-- halo -->
            <circle class="halo" cx="80" cy="58" r="52" fill="#f6d98a" />
            <ellipse cx="80" cy="226" rx="38" ry="6" fill="#000" opacity="0.35" />
            <!-- bougeoir -->
            <ellipse cx="80" cy="214" rx="40" ry="9" fill="#6e4f08" />
            <rect x="52" y="200" width="56" height="12" rx="5" fill="#b8860b" />
            <ellipse cx="80" cy="200" rx="28" ry="6" fill="#d9a933" />
            <!-- cierge -->
            <rect x="62" y="92" width="36" height="110" rx="5" fill="#f3ebd3" />
            <rect x="62" y="92" width="10" height="110" rx="5" fill="#fff" opacity="0.5" />
            <ellipse cx="80" cy="92" rx="18" ry="5" fill="#e9d8a6" />
            <!-- croix dorée sur le cierge -->
            <rect x="77" y="118" width="6" height="40" rx="1.5" fill="#b8860b" />
            <rect x="68" y="130" width="24" height="6" rx="1.5" fill="#b8860b" />
            <!-- mèche et flamme -->
            <rect x="79" y="80" width="2" height="12" fill="#3a2f27" />
            <g class="flame">
              <path d="M80 28 C66 48 64 66 80 82 C96 66 94 48 80 28 Z" fill="#f6c453" />
              <path d="M80 48 C73 60 73 70 80 80 C87 70 87 60 80 48 Z" fill="#fff6d8" />
            </g>
            <path class="smoke" d="M80 78 C74 66 88 58 80 44 C74 34 86 26 80 14" fill="none" stroke="#9aa6b8" stroke-width="2" stroke-linecap="round" />
          </svg>
          <span class="hint mt-4 text-[0.68rem] font-medium uppercase tracking-[0.14em]">Touchez le cierge</span>
        </button>
      </div>

      <!-- La carte -->
      <div class="panel rounded-[20px] p-8 backdrop-blur-xl">
        <div class="mb-5 flex items-center gap-3">
          <img :src="PLACEHOLDERS.emblem" alt="" class="h-11 w-11" />
          <p class="text-[0.7rem] font-semibold uppercase leading-relaxed tracking-[0.16em] text-[#d9a933]">Paroisse Sainte Lucie<br />de Baguida</p>
        </div>
        <h1 class="mb-1.5 font-serif text-[2rem] font-medium leading-[1.15] text-[#f5efe0]">Espace d'administration</h1>
        <p class="mb-7 text-sm text-[#a3acbb]">Connectez-vous pour gérer les annonces, l'agenda, les demandes et les dons.</p>

        <form class="flex flex-col gap-[18px]" @submit.prevent="submit">
          <div class="flex flex-col gap-2">
            <label for="email" class="text-[0.7rem] uppercase tracking-[0.1em] text-[#a3acbb]">E-mail</label>
            <input id="email" v-model="email" type="email" required autocomplete="username" placeholder="vous@exemple.com" class="dark-field" />
          </div>

          <div class="flex flex-col gap-2">
            <label for="password" class="text-[0.7rem] uppercase tracking-[0.1em] text-[#a3acbb]">Mot de passe</label>
            <div class="relative flex items-center">
              <input id="password" v-model="password" :type="showPassword ? 'text' : 'password'" required autocomplete="current-password" placeholder="Votre mot de passe" class="dark-field w-full !pr-11" />
              <button type="button" class="absolute right-1.5 rounded-lg p-1.5 text-lg text-[#8b95a7] transition-colors hover:bg-white/10 hover:text-[#f5efe0]" :aria-label="showPassword ? 'Masquer la saisie' : 'Afficher la saisie'" :aria-pressed="showPassword" @click="showPassword = !showPassword">
                <Icon :name="showPassword ? 'eye-off' : 'eye'" />
              </button>
            </div>
          </div>

          <p v-if="error" class="text-sm text-[#f5b1b1]" role="alert">{{ error }}</p>

          <button :disabled="loading" class="submit group relative mt-1.5 overflow-hidden rounded-[10px] px-5 py-3.5 text-[0.82rem] font-semibold uppercase tracking-[0.08em] text-[#1d1503] disabled:opacity-60">
            <span class="relative z-10">{{ loading ? 'Connexion…' : 'Se connecter' }}</span>
            <span class="absolute inset-y-0 -left-[60%] w-[40%] -skew-x-[20deg] bg-white/50 transition-[left] duration-500 group-hover:left-[130%]" aria-hidden="true" />
          </button>
        </form>

        <p class="mt-6 text-center text-sm"><NuxtLink to="/" class="inline-flex items-center gap-1.5 text-[#a3acbb] hover:text-[#f6e7b4]"><Icon name="chevron-left" />Retour au site</NuxtLink></p>
      </div>
    </div>
  </main>
</template>

<style scoped>
.glow {
  opacity: 0;
  transition: opacity 1s ease;
  background:
    radial-gradient(760px 760px at 30% 42%, rgba(217, 169, 51, 0.2), transparent 62%),
    radial-gradient(1200px 900px at 30% 42%, rgba(44, 82, 130, 0.35), transparent 70%);
}
.is-lit .glow { opacity: 1; }

.halo { opacity: 0.05; filter: blur(14px); transition: opacity 0.9s ease; }
.is-lit .halo { opacity: 0.28; }
.flame { opacity: 0; transform-origin: 80px 82px; transition: opacity 0.5s ease; }
.is-lit .flame { opacity: 1; animation: flicker 2.6s ease-in-out infinite; filter: drop-shadow(0 0 10px rgba(246, 196, 83, 0.9)); }
.smoke { opacity: 0.55; transition: opacity 0.6s ease; }
.is-lit .smoke { opacity: 0; }
.hint { color: #5f6b80; transition: color 0.5s ease; }
.is-lit .hint { color: #b9c1cf; }

.mote { opacity: 0; transition: opacity 0.8s ease; }
.is-lit .mote { opacity: 0.6; animation: drift 7s ease-in-out infinite; }

.panel {
  background-color: rgba(18, 28, 48, 0.62);
  border: 1px solid rgba(217, 169, 51, 0.14);
  box-shadow: 0 30px 60px -20px rgba(0, 0, 0, 0.6);
  transition: border-color 0.7s ease, box-shadow 0.7s ease;
}
.is-lit .panel {
  border-color: rgba(217, 169, 51, 0.34);
  box-shadow: 0 30px 70px -18px rgba(0, 0, 0, 0.65), 0 0 90px -20px rgba(217, 169, 51, 0.3);
}

.dark-field {
  border-radius: 10px;
  padding: 0.75rem 0.875rem;
  font-size: 0.96rem;
  color: #fff;
  background-color: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.12);
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.dark-field::placeholder { color: #6b7689; }
.dark-field:focus { border-color: rgba(217, 169, 51, 0.6); box-shadow: 0 0 0 4px rgba(217, 169, 51, 0.14); }
.dark-field:-webkit-autofill {
  -webkit-text-fill-color: #fff;
  box-shadow: 0 0 0 1000px rgba(18, 28, 48, 0.95) inset;
  caret-color: #fff;
}
/* L'icône « afficher le mot de passe » d'Edge ferait doublon avec la nôtre. */
#password::-ms-reveal { display: none; }

.submit {
  background: linear-gradient(135deg, #f6e7b4, #d9a933 45%, #86610a);
  box-shadow: 0 12px 24px -10px rgba(134, 97, 10, 0.6);
}

@keyframes flicker {
  0%, 100% { transform: scale(1) rotate(0deg); }
  25% { transform: scale(1.04, 0.97) rotate(-1.5deg); }
  50% { transform: scale(0.97, 1.05) rotate(1deg); }
  75% { transform: scale(1.03, 0.98) rotate(-0.5deg); }
}
@keyframes drift {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(6px, -16px); }
}
@media (prefers-reduced-motion: reduce) {
  .is-lit .flame, .is-lit .mote { animation: none; }
}
</style>
