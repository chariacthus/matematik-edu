import { useState } from 'react';
import clsx from 'clsx';
import { useStore } from '../state/store';
import { exportAll } from '../lib/storage';
import { navigate } from '../lib/router';
import { Callout, Card, Modal, SectionTitle } from '../components/ui';

/** Indstillinger, dataeksport og nulstilling. */
export function SettingsPage() {
  const settings = useStore((s) => s.settings);
  const update = useStore((s) => s.updateSettings);
  const resetAll = useStore((s) => s.resetAll);
  const importState = useStore((s) => s.importState);

  const [confirmReset, setConfirmReset] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [importText, setImportText] = useState('');
  const [importNote, setImportNote] = useState<string | null>(null);

  const download = () => {
    const blob = new Blob([exportAll()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `matematik-ai-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <button onClick={() => navigate({ name: 'profile' })} className="btn-ghost -ml-2 mb-1 px-2 py-1 text-xs">
          ← Profil
        </button>
        <h1 className="text-2xl font-extrabold tracking-tight">Indstillinger</h1>
      </header>

      {/* Udseende */}
      <section>
        <SectionTitle>Udseende</SectionTitle>
        <Card className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-semibold">Tema</p>
            <div className="flex gap-2">
              {(['light', 'dark', 'system'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => update({ theme: t })}
                  className={clsx(
                    'flex-1 rounded-xl border-2 px-3 py-2 text-sm font-semibold transition-colors',
                    settings.theme === t
                      ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-200'
                      : 'border-ink-200 dark:border-ink-700',
                  )}
                  aria-pressed={settings.theme === t}
                >
                  {{ light: 'Lyst', dark: 'Mørkt', system: 'Følg system' }[t]}
                </button>
              ))}
            </div>
          </div>

          <Toggle
            label="Spørg hvor sikker jeg er"
            help="Ved mestringstjek bliver du spurgt hvor sikker du føler dig. Det hjælper dig med at mærke forskel på at gætte og at vide."
            checked={settings.askConfidence}
            onChange={(v) => update({ askConfidence: v })}
          />
        </Card>
      </section>

      {/* AI-lærer */}
      <section>
        <SectionTitle>AI-lærer</SectionTitle>
        <Card className="space-y-4">
          <Callout tone="neutral" icon={<span aria-hidden>ℹ️</span>}>
            Den indbyggede AI-lærer virker uden internet og uden nøgle. Den bygger på opgavernes egne hints og
            løsningstrin, så den ikke kan finde på matematik der ikke passer.
          </Callout>

          <Toggle
            label="Brug Claude som AI-lærer"
            help="Giver mere frit formulerede forklaringer. Kræver din egen API-nøgle, og der sendes data til Anthropic."
            checked={settings.useLlmTutor}
            onChange={(v) => update({ useLlmTutor: v })}
          />

          {settings.useLlmTutor ? (
            <div>
              <label className="mb-1.5 block text-sm font-semibold" htmlFor="apikey">
                Claude API-nøgle
              </label>
              <div className="flex gap-2">
                <input
                  id="apikey"
                  type={showKey ? 'text' : 'password'}
                  value={settings.apiKey}
                  onChange={(e) => update({ apiKey: e.target.value })}
                  placeholder="sk-ant-…"
                  className="field flex-1 font-mono text-sm"
                  autoComplete="off"
                  spellCheck={false}
                />
                <button onClick={() => setShowKey((v) => !v)} className="btn-secondary px-3 text-xs">
                  {showKey ? 'Skjul' : 'Vis'}
                </button>
              </div>
              <p className="mt-2 text-xs text-ink-500 dark:text-ink-400">
                Nøglen gemmes kun i din browser og sendes kun til Anthropics API. Fejler kaldet, svarer den indbyggede
                lærer i stedet.
              </p>
            </div>
          ) : null}
        </Card>
      </section>

      {/* Data */}
      <section>
        <SectionTitle>Dine data</SectionTitle>
        <Card className="space-y-4">
          <p className="text-sm text-ink-600 dark:text-ink-300">
            Alt hvad du laver, bliver gemt i din egen browser. Der sendes ikke noget til en server, og der er ingen
            konto. Skifter du computer, kan du tage dine data med herunder.
          </p>

          <div className="flex flex-wrap gap-2">
            <button onClick={download} className="btn-secondary">
              Hent mine data
            </button>
            <button onClick={() => setConfirmReset(true)} className="btn-ghost text-bad-600 hover:bg-bad-100 dark:text-bad-400">
              Nulstil alt
            </button>
          </div>

          <details className="text-sm">
            <summary className="cursor-pointer font-semibold">Gendan fra en fil</summary>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="Indsæt indholdet af din gemte fil her"
              className="field mt-2 h-28 font-mono text-xs"
              spellCheck={false}
            />
            <button
              onClick={() => setImportNote(importState(importText) ? 'Dine data er gendannet.' : 'Filen kunne ikke læses — er det den rigtige fil?')}
              disabled={!importText.trim()}
              className="btn-secondary mt-2"
            >
              Gendan
            </button>
            {importNote ? <p className="mt-2 text-xs font-semibold">{importNote}</p> : null}
          </details>
        </Card>
      </section>

      <p className="pb-4 text-center text-xs text-ink-400 dark:text-ink-500">
        MatematikAI · adaptiv matematiktutor til 9. klasse
      </p>

      <Modal open={confirmReset} onClose={() => setConfirmReset(false)} title="Nulstil alt?">
        <p className="text-sm leading-relaxed text-ink-600 dark:text-ink-300">
          Det sletter din profil, dine resultater, din niveautest og alle dine badges. Det kan ikke fortrydes.
        </p>
        <p className="mt-3 text-sm font-semibold">Vil du hente dine data først?</p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button onClick={download} className="btn-secondary flex-1">
            Hent mine data
          </button>
          <button
            onClick={() => {
              resetAll();
              setConfirmReset(false);
              navigate({ name: 'onboarding' });
            }}
            className="btn flex-1 bg-bad-600 text-white hover:bg-bad-700"
          >
            Ja, slet alt
          </button>
        </div>
      </Modal>
    </div>
  );
}

function Toggle({
  label,
  help,
  checked,
  onChange,
}: {
  label: string;
  help: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <button
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={clsx(
          'mt-0.5 flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors',
          checked ? 'bg-brand-600' : 'bg-ink-300 dark:bg-ink-700',
        )}
      >
        <span className={clsx('h-5 w-5 rounded-full bg-white shadow transition-transform', checked && 'translate-x-5')} />
      </button>
      <div className="min-w-0">
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs text-ink-500 dark:text-ink-400">{help}</p>
      </div>
    </div>
  );
}
