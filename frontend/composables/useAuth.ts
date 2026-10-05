export type AuthUser = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'EDITOR' | 'CONTRIBUTOR';
};

export const useAuth = () => {
  const user = useState<AuthUser | null>('auth-user', () => null);

  async function fetchMe() {
    try {
      // Côté serveur (SSR), il faut transmettre le cookie du navigateur à l'API.
      const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined;
      const res = await $fetch<{ user: AuthUser }>('/api/auth/me', { headers });
      user.value = res.user;
    } catch {
      user.value = null;
    }
    return user.value;
  }

  async function login(email: string, password: string) {
    const res = await $fetch<{ user: AuthUser }>('/api/auth/login', { method: 'POST', body: { email, password } });
    user.value = res.user;
  }

  async function logout() {
    await $fetch('/api/auth/logout', { method: 'POST' });
    user.value = null;
    await navigateTo('/admin/login');
  }

  return { user, fetchMe, login, logout };
};
