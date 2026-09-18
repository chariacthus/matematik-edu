import { useState } from 'react';
import clsx from 'clsx';
import { useStore } from '../state/store';
import { exportAll } from '../lib/storage';
import { navigate } from '../lib/router';
import { Card, Chip, Modal, PageHeader, SectionTitle } from '../components/ui';
import { MODELS, costOfUsageDkk, costPerQuestionDkk, formatDkk, getModel } from '../tutor/models';
import { Icon } from '../components/Icon';

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
      <PageHeader title="Indstillinger" back={{ label: 'Profil', onClick: () => navigate({ name: 'profile' }) }} />

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
                    'flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border-2 px-3 py-2 text-sm font-semibold transition-colors',
                    settings.theme === t
                      ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-200'
                      : 'border-ink-200 dark:border-ink-700',
                  )}
                  aria-pressed={settings.theme === t}
                >
                  <Icon name={{ light: 'sun', dark: 'moon', system: 'monitor' }[t] as 'sun'} size={15} />
                  {{ light: 'Lyst', dark: 'Mørkt', system: 'System' }[t]}
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
          <div className="rounded-xl border border-good-200 bg-good-100 p-3.5 dark:border-good-900 dark:bg-good-900/25">
            <p className="flex items-center gap-2 text-sm font-bold text-good-900 dark:text-good-100">
              <Icon name="check" size={16} /> Den indbyggede AI-lærer er gratis
            </p>
            <p className="mt-1 text-sm leading-relaxed text-good-900/90 dark:text-good-100/90">
              Den kører i din browser uden internet og uden nøgle, og koster ingenting — hverken nu eller senere. Den
              bruger opgavernes egne hints og løsningstrin, så den ikke kan finde på matematik der ikke passer.
            </p>
          </div>

          <Toggle
            label="Tilkobl Claude i stedet"
            help="Giver mere frit formulerede forklaringer. Kræver din egen API-nøgle, og så koster hvert spørgsmål penge."
            checked={settings.useLlmTutor}
            onChange={(v) => update({ useLlmTutor: v })}
          />

          {settings.useLlmTutor ? (
            <>
              <div>
                <p className="mb-2 text-sm font-semibold">Vælg model</p>
                <div className="space-y-2">
                  {MODELS.map((m) => {
                    const selected = settings.llmModel === m.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => update({ llmModel: m.id })}
                        aria-pressed={selected}
                        className={clsx(
                          'flex w-full items-start gap-3 rounded-xl border-2 p-3 text-left transition-colors',
                          selected
                            ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/50'
                            : 'border-ink-200 dark:border-ink-700',
                        )}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="font-bold">{m.name}</span>
                            <Chip tone={m.id === MODELS[0]!.id ? 'good' : 'neutral'}>
                              {formatDkk(costPerQuestionDkk(m))} pr. spørgsmål
                            </Chip>
                          </span>
                          <span className="mt-1 block text-xs text-ink-500 dark:text-ink-400">{m.blurb}</span>
                          <span className="mt-1 block text-[11px] tabular-nums text-ink-400 dark:text-ink-500">
                            ${m.inputPerM}/mio. input · ${m.outputPerM}/mio. output
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

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
                  Nøglen gemmes kun i din browser og sendes kun til Anthropics API. Fejler kaldet, svarer den
                  indbyggede lærer i stedet.
                </p>
              </div>

              {settings.llmUsage.calls > 0 ? (
                <div className="rounded-xl bg-ink-100 p-3 dark:bg-ink-800">
                  <p className="text-xs font-bold uppercase tracking-wide text-ink-400">Forbrug indtil nu</p>
                  <p className="mt-1 text-sm">
                    {settings.llmUsage.calls} spørgsmål ·{' '}
                    <span className="font-bold">
                      {formatDkk(costOfUsageDkk(getModel(settings.llmModel), settings.llmUsage.input, settings.llmUsage.output))}
                    </span>
                  </p>
                  <button
                    onClick={() => update({ llmUsage: { input: 0, output: 0, calls: 0 } })}
                    className="btn-ghost mt-1 -ml-2 px-2 py-1 text-xs"
                  >
                    Nulstil tælleren
                  </button>
                </div>
              ) : null}
            </>
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
