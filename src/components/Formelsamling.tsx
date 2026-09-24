import { useEffect, useState } from 'react';
import { FORMELSAMLING } from '../content/formelsamling';
import { MathBlock } from './MathText';
import { Icon } from './Icon';
import { Portal } from './Portal';
import { useIsNarrow } from '../lib/media';

export function FormelsamlingButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className={className ?? 'btn-secondary'}>
        <Icon name="book" size={16} />
        Formelsamling
      </button>
      <FormelsamlingPanel open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function FormelsamlingPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const narrow = useIsNarrow();
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const q = query.trim().toLowerCase();
  const groups = FORMELSAMLING.map((g) => ({
    ...g,
    entries: q ? g.entries.filter((e) => `${g.title} ${e.name} ${e.note ?? ''}`.toLowerCase().includes(q)) : g.entries,
  })).filter((g) => g.entries.length);

  return (
    <Portal>
      {narrow ? <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose} aria-hidden /> : null}
      <div
        role="dialog"
        aria-label="Formelsamling"
        className={
          'glass-strong fixed z-50 flex animate-panel-in flex-col overflow-hidden rounded-3xl shadow-lift ' +
          (narrow ? 'safe-bottom inset-x-2 bottom-2 top-20' : 'bottom-24 right-6 h-[min(600px,calc(100vh-8rem))] w-[400px] lg:bottom-6')
        }
      >
        <header className="flex items-center gap-3 border-b border-ink-200 px-4 py-3 dark:border-white/10">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-900 dark:text-white">
              Formelsamling
            </p>
            <p className="text-2xs text-ink-500 dark:text-ink-400">Må bruges til prøven med hjælpemidler</p>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5" aria-label="Luk formelsamling">
            <Icon name="close" size={18} />
          </button>
        </header>

        <div className="border-b border-ink-200 px-4 py-2.5 dark:border-white/10">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Søg, fx areal, cirkel eller rente"
            className="field text-sm"
            aria-label="Søg i formelsamlingen"
            type="search"
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {groups.length ? (
            groups.map((g) => (
              <section key={g.title} className="mb-5 last:mb-0">
                <h3 className="eyebrow mb-2">{g.title}</h3>
                <ul className="space-y-2.5">
                  {g.entries.map((e) => (
                    <li key={e.name} className="card px-3 py-2.5">
                      <p className="text-xs font-semibold text-ink-600 dark:text-ink-300">{e.name}</p>
                      <MathBlock tex={e.tex} className="overflow-x-auto py-1" />
                      {e.note ? <p className="text-2xs text-ink-500 dark:text-ink-400">{e.note}</p> : null}
                    </li>
                  ))}
                </ul>
              </section>
            ))
          ) : (
            <p className="py-6 text-center text-sm text-ink-500 dark:text-ink-400">Ingen formler matcher “{query}”.</p>
          )}
        </div>
      </div>
    </Portal>
  );
}
