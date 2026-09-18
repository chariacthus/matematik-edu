import { useMemo } from 'react';
import katex from 'katex';

/**
 * Tekst med indlejret matematik.
 *
 * Opgaveteksterne blander dansk og LaTeX ("Beregn $2x + 4 = 12$"). Vi
 * splitter på $-tegn og lader KaTeX tage de matematiske stumper.
 * Fejler en formel, viser vi den rå kildetekst i stedet for at lade
 * siden gå i stykker — en elev skal aldrig møde en tom opgave.
 */

function render(tex: string, display: boolean): string {
  try {
    return katex.renderToString(tex, {
      displayMode: display,
      throwOnError: false,
      strict: false,
      output: 'html',
      trust: false,
    });
  } catch {
    return `<code>${escapeHtml(tex)}</code>`;
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
}

export function MathText({ children, className }: { children: string; className?: string }) {
  const html = useMemo(() => {
    const parts = children.split(/\$/g);
    return parts
      .map((part, i) => (i % 2 === 1 ? render(part, false) : escapeHtml(part).replace(/\n/g, '<br/>')))
      .join('');
  }, [children]);

  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

/** En formel der står alene, centreret på sin egen linje. */
export function MathBlock({ tex, className }: { tex: string; className?: string }) {
  const html = useMemo(() => render(tex, true), [tex]);
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

/** En formel midt i en sætning. */
export function MathInline({ tex, className }: { tex: string; className?: string }) {
  const html = useMemo(() => render(tex, false), [tex]);
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
