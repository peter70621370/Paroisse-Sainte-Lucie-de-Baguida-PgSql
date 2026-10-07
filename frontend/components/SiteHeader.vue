<script setup lang="ts">
const { name, customLogo } = await useSite();
const route = useRoute();
const mobileOpen = ref(false);
const hoverOpened = ref(false);
const openMenu = ref<string | null>(null);
watch(() => route.fullPath, () => { mobileOpen.value = false; openMenu.value = null; });

// Souris : le menu s'ouvre au survol. Un clic juste après ne doit PAS le refermer (sinon le menu « clignote »).
// Tactile / clavier : le clic ouvre et ferme.
function onEnter(label: string) {
  if (window.matchMedia('(hover: hover)').matches) { openMenu.value = label; hoverOpened.value = true; }
}
function onLeave() { openMenu.value = null; hoverOpened.value = false; }
function onClick(label: string) {
  if (hoverOpened.value && openMenu.value === label) { hoverOpened.value = false; return; }
  openMenu.value = openMenu.value === label ? null : label;
}

const isActive = (item: NavItem) =>
  item.to ? (item.to === '/' ? route.path === '/' : route.path.startsWith(item.to)) : item.children?.some((c) => route.path.startsWith(c.to));

// « Paroisse Sainte Lucie de Baguida » → sur-titre « Paroisse », nom « Sainte Lucie », lieu « de Baguida »
const parts = computed(() => {
  const m = name.value.match(/^(Paroisse)\s+(.+?)\s+(d[eu']\s?.+)$/i);
  return m ? { over: m[1], main: m[2], under: m[3] } : { over: '', main: name.value, under: '' };
});
const linkCls = 'block px-3.5 py-3.5 text-[0.82rem] font-semibold uppercase tracking-wider text-white transition hover:text-gold-light';
</script>

<template>
  <header class="border-b border-gold/25 bg-cream">
    <div class="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:py-4">
      <NuxtLink to="/" class="flex min-w-0 items-center gap-3" :aria-label="`${name} – accueil`">
        <img v-if="customLogo" :src="customLogo" width="224" height="56" :alt="`Logo ${name}`" class="h-14 w-auto max-w-[260px] object-contain md:h-16" />
        <template v-else>
          <img :src="PLACEHOLDERS.emblem" width="60" height="60" alt="" class="h-12 w-12 shrink-0 md:h-[60px] md:w-[60px]" />
          <span class="min-w-0 leading-none">
            <span v-if="parts.over" class="block text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-gold-dark md:text-xs">{{ parts.over }}</span>
            <span class="mt-1 block truncate font-serif text-xl font-bold text-navy md:text-[1.7rem]">{{ parts.main }}</span>
            <span v-if="parts.under" class="mt-1 block text-[0.65rem] font-semibold uppercase tracking-[0.26em] text-navy/75 md:text-xs">{{ parts.under }}</span>
          </span>
        </template>
      </NuxtLink>

      <div class="flex shrink-0 items-center gap-3">
        <NuxtLink to="/horaires" class="btn btn-sm btn-outline hidden lg:inline-flex"><Icon name="clock" />Horaires des messes</NuxtLink>
        <NuxtLink to="/dons" class="btn btn-sm btn-gold hidden sm:inline-flex"><Icon name="heart" />Faire un don</NuxtLink>
        <NuxtLink to="/direct" class="btn btn-sm btn-outline hidden lg:inline-flex"><Icon name="video" />Messe en direct</NuxtLink>
        <button
          class="flex items-center gap-2 rounded-full border border-navy/40 px-4 py-2 text-sm font-semibold text-navy lg:hidden"
          :aria-expanded="mobileOpen"
          aria-controls="main-nav"
          @click="mobileOpen = !mobileOpen"
        >
          <Icon :name="mobileOpen ? 'close' : 'menu'" />{{ mobileOpen ? 'Fermer' : 'Menu' }}
        </button>
      </div>
    </div>
  </header>

  <nav id="main-nav" aria-label="Navigation principale" :class="[mobileOpen ? 'block' : 'hidden', 'z-30 bg-navy shadow-md lg:sticky lg:top-0 lg:block']">
    <ul class="mx-auto flex max-w-6xl flex-col px-2 py-2 lg:flex-row lg:flex-wrap lg:justify-center lg:px-4 lg:py-0">
      <li v-for="item in NAV" :key="item.label" class="group relative" @mouseleave="onLeave">
        <NuxtLink v-if="item.to" :to="item.to" :class="[linkCls, isActive(item) ? '!text-gold-light lg:shadow-[inset_0_-3px_0_theme(colors.gold.DEFAULT)]' : '']">
          {{ item.label }}
        </NuxtLink>
        <template v-else>
          <button
            :class="[linkCls, 'flex w-full items-center gap-1 text-left', isActive(item) ? '!text-gold-light lg:shadow-[inset_0_-3px_0_theme(colors.gold.DEFAULT)]' : '']"
            :aria-expanded="openMenu === item.label"
            @click="onClick(item.label)"
            @mouseenter="onEnter(item.label)"
          >
            {{ item.label }} <Icon name="chevron-down" :class="['!h-3.5 !w-3.5 transition', openMenu === item.label ? 'rotate-180' : '']" />
          </button>
          <ul
            v-show="openMenu === item.label"
            class="rounded-lg bg-navy-dark py-1 lg:absolute lg:left-0 lg:top-full lg:z-30 lg:min-w-[16rem] lg:rounded-b-xl lg:rounded-t-none lg:border-t-[3px] lg:border-gold lg:bg-white lg:py-2 lg:shadow-lift"
          >
            <li v-for="c in item.children" :key="c.to">
              <NuxtLink :to="c.to" class="block px-6 py-2.5 text-[0.95rem] text-white/90 hover:bg-white/10 hover:text-gold-light lg:px-5 lg:text-navy lg:hover:bg-cream lg:hover:text-gold-dark">{{ c.label }}</NuxtLink>
            </li>
          </ul>
        </template>
      </li>
      <li class="px-3 py-3 sm:hidden"><NuxtLink to="/dons" class="btn btn-sm btn-gold w-full"><Icon name="heart" />Faire un don</NuxtLink></li>
    </ul>
  </nav>
</template>
