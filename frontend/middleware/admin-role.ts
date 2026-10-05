// À utiliser APRÈS « admin » : réserve la page aux administrateurs.
export default defineNuxtRouteMiddleware(() => {
  const { user } = useAuth();
  if (user.value?.role !== 'ADMIN') return navigateTo('/admin');
});
