<script setup lang="ts">
const { name, tagline, logo } = await useSite();
const route = useRoute();
const mobileOpen = ref(false);
const openMenu = ref<string | null>(null);
watch(() => route.fullPath, () => { mobileOpen.value = false; openMenu.value = null; });

const isActive = (item: NavItem) =>
  item.to ? (item.to === '/' ? route.path === '/' : route.path.startsWith(item.to)) : item.children?.some((c) => route.path.startsWith(c.to));
</script>

<template>
  <header class="border-b border-gold/30 bg-cream">
    <div class="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
      <NuxtLink to="/" class="flex items-center gap-3" :aria-label="`${name} – accueil`">
        <img :src="logo" :alt="`Logo ${name}`" class="h-14 w-auto max-w-[260px] object-contain md:h-16" />
      </NuxtLink>
      <p v-if="tagline" class="hidden font-serif text-sm italic text-navy/70 lg:block">{{ tagline }}</p>
      <button
        class="rounded border border-navy/40 px-3 py-2 text-sm text-navy lg:hidden"
        :aria-expanded="mobileOpen"
        aria-controls="main-nav"
        @click="mobileOpen = !mobileOpen"
      >
        {{ mobileOpen ? 'Fermer' : 'Menu' }}
      </button>
    </div>

    <nav id="main-nav" aria-label="Navigation principale" :class="[mobileOpen ? 'block' : 'hidden', 'bg-navy lg:block']">
      <ul class="mx-auto flex max-w-6xl flex-col px-2 lg:flex-row lg:flex-wrap lg:justify-center lg:px-4">
        <li
          v-for="item in NAV"
          :key="item.label"
          class="group relative"
          @mouseleave="openMenu = null"
        >
          <NuxtLink
            v-if="item.to"
            :to="item.to"
            :class="['block px-4 py-3 text-sm font-medium tracking-wide text-white hover:text-gold-light', isActive(item) ? 'text-gold-light lg:border-b-2 lg:border-gold' : '']"
          >
            {{ item.label }}
          </NuxtLink>
          <template v-else>
            <button
              :class="['flex w-full items-center gap-1 px-4 py-3 text-left text-sm font-medium tracking-wide text-white hover:text-gold-light', isActive(item) ? 'text-gold-light lg:border-b-2 lg:border-gold' : '']"
              :aria-expanded="openMenu === item.label"
              @click="openMenu = openMenu === item.label ? null : item.label"
              @mouseenter="openMenu = item.label"
            >
              {{ item.label }} <span aria-hidden="true" class="text-xs">▾</span>
            </button>
            <ul
              v-show="openMenu === item.label"
              class="bg-navy-dark lg:absolute lg:left-0 lg:top-full lg:z-30 lg:min-w-[14rem] lg:rounded-b lg:shadow-lg"
            >
              <li v-for="c in item.children" :key="c.to">
                <NuxtLink :to="c.to" class="block px-6 py-2.5 text-sm text-white/90 hover:bg-white/10 hover:text-gold-light lg:px-4">{{ c.label }}</NuxtLink>
              </li>
            </ul>
          </template>
        </li>
      </ul>
    </nav>
  </header>
</template>
