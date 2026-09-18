const PREFIX = 'matematik-ai:';

/**
 * localStorage kan kaste (privat browsing, blokerede cookies, fuld kvote).
 * Appen skal virke alligevel — den mister bare hukommelsen mellem besøg.
 */
export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function save(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function clearAll(): void {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ingen adgang til storage — intet at rydde */
  }
}

export function exportAll(): string {
  const out: Record<string, unknown> = {};
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => {
        out[k.slice(PREFIX.length)] = JSON.parse(localStorage.getItem(k) as string);
      });
  } catch {
    /* tom eksport er bedre end et crash */
  }
  return JSON.stringify(out, null, 2);
}

export function importAll(json: string): boolean {
  try {
    const parsed = JSON.parse(json) as Record<string, unknown>;
    Object.entries(parsed).forEach(([k, v]) => save(k, v));
    return true;
  } catch {
    return false;
  }
}
