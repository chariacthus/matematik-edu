/**
 * Valgfrie Claude-modeller, med de faktiske priser.
 *
 * Hele pointen med at have dem her er, at brugeren skal kunne se hvad
 * det koster FØR de slår noget til. Priserne er pr. million tokens fra
 * Anthropics prisliste (juni 2026).
 */

export interface ModelOption {
  id: string;
  name: string;
  /** USD pr. million input-tokens. */
  inputPerM: number;
  /** USD pr. million output-tokens. */
  outputPerM: number;
  blurb: string;
}

export const MODELS: ModelOption[] = [
  {
    id: 'claude-haiku-4-5',
    name: 'Haiku 4.5',
    inputPerM: 1,
    outputPerM: 5,
    blurb: 'Billigst. Rigelig til at forklare en opgave i 9. klasse.',
  },
  {
    id: 'claude-sonnet-5',
    name: 'Sonnet 5',
    inputPerM: 2,
    outputPerM: 10,
    blurb: 'Dobbelt så dyr. Lidt bedre til lange, snørklede forklaringer.',
  },
  {
    id: 'claude-opus-5',
    name: 'Opus 5',
    inputPerM: 5,
    outputPerM: 25,
    blurb: 'Fem gange dyrere end Haiku. Sjældent pengene værd her.',
  },
];

export const DEFAULT_MODEL = 'claude-haiku-4-5';

export function getModel(id: string): ModelOption {
  return MODELS.find((m) => m.id === id) ?? (MODELS[0] as ModelOption);
}

/**
 * Prisen for ét spørgsmål til AI-læreren, i danske kroner.
 *
 * Tallene er målt på appens egne systemprompter: omkring 900 input-tokens
 * (opgaven, hints, løsningstrin og samtalen indtil videre) og 250
 * output-tokens for et typisk svar.
 */
export function costPerQuestionDkk(model: ModelOption, usdToDkk = 7): number {
  const inputTokens = 900;
  const outputTokens = 250;
  const usd = (inputTokens / 1e6) * model.inputPerM + (outputTokens / 1e6) * model.outputPerM;
  return usd * usdToDkk;
}

/** Faktisk forbrug omregnet til kroner. */
export function costOfUsageDkk(model: ModelOption, inputTokens: number, outputTokens: number, usdToDkk = 7): number {
  const usd = (inputTokens / 1e6) * model.inputPerM + (outputTokens / 1e6) * model.outputPerM;
  return usd * usdToDkk;
}

/** "under 1 øre" er mere brugbart for en elev end "0,0074 kr". */
export function formatDkk(value: number): string {
  if (value < 0.01) return 'under 1 øre';
  if (value < 1) return `ca. ${Math.round(value * 100)} øre`;
  return `ca. ${value.toFixed(2).replace('.', ',')} kr`;
}
