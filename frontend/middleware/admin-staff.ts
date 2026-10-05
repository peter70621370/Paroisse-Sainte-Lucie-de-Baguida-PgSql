// À utiliser APRÈS « admin » : réserve la page aux administrateurs et éditeurs (données personnelles).
export default defineNuxtRouteMiddleware(() => {
  const { user } = useAuth();
  if (user.value?.role === 'CONTRIBUTOR') return navigateTo('/admin');
});
