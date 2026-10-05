// Protège les pages du back-office : redirige vers la connexion si aucune session valide.
export default defineNuxtRouteMiddleware(async () => {
  const { user, fetchMe } = useAuth();
  if (!user.value) await fetchMe();
  if (!user.value) return navigateTo('/admin/login');
});
