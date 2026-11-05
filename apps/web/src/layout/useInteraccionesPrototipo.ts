'use client';

import { useEffect } from 'react';

/**
 * Comportamiento de los controles del prototipo (rc-segmented, rc-tabs, rc-stepper) en las
 * páginas que todavía son borradores estáticos. Cuando una página pase a estado de React,
 * sus controles dejan de depender de esto.
 */
export function useInteraccionesPrototipo() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      const seg = t.closest('.rc-segmented button');
      if (seg && !seg.closest('[data-controlado]')) {
        seg.parentElement!.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === seg)));
      }
      const tab = t.closest<HTMLButtonElement>('.rc-tab');
      if (tab && !tab.disabled && !tab.closest('[data-controlado]')) {
        tab.closest('.rc-tabs')!.querySelectorAll('.rc-tab').forEach((x) => x.setAttribute('aria-selected', String(x === tab)));
      }
      const paso = t.closest('.rc-stepper button');
      if (paso && !paso.closest('[data-controlado]')) {
        const s = paso.closest('.rc-stepper')!;
        const input = s.querySelector('input')!;
        const delta = paso === s.querySelectorAll('button')[0] ? -1 : 1;
        input.value = String(Math.max(0, (Number(input.value) || 0) + delta));
      }
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);
}
