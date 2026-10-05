/** useFetch authentifié (transmet le cookie de session pendant le rendu serveur). */
export function useAdminFetch<T>(url: string | (() => string), opts: Record<string, any> = {}) {
  return useFetch<T>(url, { ...opts, headers: useRequestHeaders(['cookie']) });
}

/** ISO (UTC) -> valeur d'un <input type="datetime-local"> en heure locale. */
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Valeur d'un <input type="datetime-local"> -> ISO (UTC), ou null si vide. */
export function fromLocalInput(v: string): string | null {
  return v ? new Date(v).toISOString() : null;
}

export const dateOnly = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : '');
export const fmtDate = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString('fr-FR') : '');

export const slugify = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100);

export const weekdays = [
  ['MONDAY', 'Lundi'], ['TUESDAY', 'Mardi'], ['WEDNESDAY', 'Mercredi'], ['THURSDAY', 'Jeudi'],
  ['FRIDAY', 'Vendredi'], ['SATURDAY', 'Samedi'], ['SUNDAY', 'Dimanche'],
] as const;
