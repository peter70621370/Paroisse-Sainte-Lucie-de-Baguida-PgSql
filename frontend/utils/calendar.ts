// Agenda : tous les horaires sont affichés à l'heure de la paroisse (Lomé, UTC+0, sans heure d'été).
export const PARISH_TZ = 'Africa/Lome';

const dayFmt = new Intl.DateTimeFormat('en-CA', { timeZone: PARISH_TZ }); // AAAA-MM-JJ
const timeFmt = new Intl.DateTimeFormat('fr-FR', { timeZone: PARISH_TZ, hour: '2-digit', minute: '2-digit' });

/** Jour (AAAA-MM-JJ) d'un instant, à l'heure de la paroisse. */
export const dayKey = (iso: string | Date) => dayFmt.format(new Date(iso));
/** « 18h30 » */
/** « 18:30 » (tri, comparaisons) */
export const timeKey = (iso: string | Date) => timeFmt.format(new Date(iso));
/** « 18h30 » (« 18:30 » en anglais) */
export const timeLabel = (iso: string | Date) => (loc() === 'en' ? timeKey(iso) : timeKey(iso).replace(':', 'h').replace(/^0/, ''));
export const todayKey = () => dayKey(new Date());

const utcDate = (key: string) => new Date(`${key}T00:00:00Z`);
export const addDays = (key: string, n: number) => new Date(utcDate(key).getTime() + n * 86_400_000).toISOString().slice(0, 10);
/** 0 = lundi … 6 = dimanche */
export const weekdayIndex = (key: string) => (utcDate(key).getUTCDay() + 6) % 7;
export const WEEKDAY_KEYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

export const monthLabel = (ym: string) =>
  utcDate(`${ym}-01`).toLocaleDateString(dateLocale(), { month: 'long', year: 'numeric', timeZone: 'UTC' });
export const dayLong = (key: string) => utcDate(key).toLocaleDateString(dateLocale(), { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
export const shiftMonth = (ym: string, delta: number) => {
  const [y, m] = ym.split('-').map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};

/** Semaines (lundi → dimanche) couvrant le mois « AAAA-MM ». */
export function monthGrid(ym: string) {
  const first = `${ym}-01`;
  const start = addDays(first, -weekdayIndex(first));
  const next = `${shiftMonth(ym, 1)}-01`;
  const last = addDays(next, -1);
  const end = addDays(last, 6 - weekdayIndex(last));
  const weeks: { key: string; inMonth: boolean }[][] = [];
  for (let d = start; d <= end; d = addDays(d, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, i) => ({ key: addDays(d, i), inMonth: addDays(d, i).startsWith(ym) })));
  }
  return { weeks, from: start, to: end };
}
