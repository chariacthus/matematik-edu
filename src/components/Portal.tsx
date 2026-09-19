import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';

/**
 * Hænger indholdet direkte på <body>.
 *
 * Det er ikke kosmetik. `position: fixed` regnes normalt ud fra
 * vinduet, men et element med `backdrop-filter`, `filter` eller
 * `transform` bliver selv udgangspunktet for sine faste efterkommere.
 * Hele glas-designet bygger på `backdrop-filter`, så et flydende panel
 * inde i et kort ville blive klemt ned i kortets kasse i stedet for at
 * fylde skærmen — og så er der ikke plads til samtalen.
 */
export function Portal({ children }: { children: ReactNode }) {
  const [host, setHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    setHost(el);
    return () => {
      el.remove();
    };
  }, []);

  if (!host) return null;
  return createPortal(children, host);
}
