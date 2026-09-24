import type { Attempt } from '../types';
import { dayKey } from '../lib/dates';

export interface DayActivity {
  day: string;
  ts: number;
  total: number;
  correct: number;
}

/** Opgaver pr. dag, ældste først og i dag til sidst. Dage uden opgaver er med som nul. */
export function dailyActivity(attempts: Attempt[], days = 14, now = Date.now()): DayActivity[] {
  const out: DayActivity[] = [];
  const index = new Map<string, DayActivity>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const entry = { day: dayKey(d.getTime()), ts: d.getTime(), total: 0, correct: 0 };
    out.push(entry);
    index.set(entry.day, entry);
  }
  for (const a of attempts) {
    const entry = index.get(dayKey(a.ts));
    if (!entry) continue;
    entry.total += 1;
    if (a.correct) entry.correct += 1;
  }
  return out;
}
