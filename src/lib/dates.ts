/** "2026-09-18" i lokal tid — bruges til streaks og dagsmål. */
export function dayKey(ts: number = Date.now()): string {
  const d = new Date(ts);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export const DAY_MS = 24 * 60 * 60 * 1000;

export function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number) as [number, number, number];
  const [by, bm, bd] = b.split('-').map(Number) as [number, number, number];
  const da = Date.UTC(ay, am - 1, ad);
  const db = Date.UTC(by, bm - 1, bd);
  return Math.round((db - da) / DAY_MS);
}

/** "om 3 dage", "i dag", "for 2 dage siden". */
export function relativeDays(ts: number | null): string {
  if (ts === null) return 'aldrig';
  const diff = Math.round((ts - Date.now()) / DAY_MS);
  if (diff === 0) return 'i dag';
  if (diff === 1) return 'i morgen';
  if (diff === -1) return 'i går';
  if (diff > 1) return `om ${diff} dage`;
  return `for ${Math.abs(diff)} dage siden`;
}

export function formatMinutes(totalMinutes: number): string {
  const m = Math.round(totalMinutes);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest === 0 ? `${h} t` : `${h} t ${rest} min`;
}
