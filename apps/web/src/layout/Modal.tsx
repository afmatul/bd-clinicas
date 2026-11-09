'use client';

import { useEffect, useRef, type ComponentType, type ReactNode } from 'react';
import { X, type LucideProps } from 'lucide-react';

/**
 * Modal del design system (rc-scrim + rc-modal): Esc y el fondo cierran, el foco entra al
 * primer campo y vuelve al botón que lo abrió. Formularios cortos de 1 a 3 campos.
 */
export function Modal({ titulo, icono: Icono, tono = 'primary', onCerrar, children, pie }: {
  titulo: string;
  icono?: ComponentType<LucideProps>;
  tono?: 'primary' | 'danger';
  onCerrar(): void;
  children: ReactNode;
  pie: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previo = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>('input:not([type="hidden"]), select, textarea, button:not([aria-label="Cerrar"])')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar();
      if (e.key !== 'Tab' || !ref.current) return;
      const f = [...ref.current.querySelectorAll<HTMLElement>('input:not([type="hidden"]), select, textarea, button, a[href]')].filter((x) => !x.hasAttribute('disabled'));
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1]!.focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0]!.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); previo?.focus(); };
  }, [onCerrar]);

  return (
    <div className="rc-scrim" style={{ position: 'fixed', inset: 0 }} onMouseDown={(e) => { if (e.target === e.currentTarget) onCerrar(); }}>
      <div className="rc-modal" role="dialog" aria-modal="true" aria-labelledby="modal-titulo" ref={ref}>
        <div className="rc-modal__header">
          {Icono && (
            <span className="rc-modal__icon"
              style={tono === 'primary' ? { background: 'var(--primary-soft)', color: 'var(--on-primary-soft)' } : undefined}>
              <Icono strokeWidth={1.75} aria-hidden="true" />
            </span>
          )}
          <div style={{ flex: 1 }}><h2 className="rc-modal__title" id="modal-titulo">{titulo}</h2></div>
          <button className="rc-btn rc-btn--ghost rc-btn--neutral rc-btn--icon rc-btn--sm" aria-label="Cerrar" onClick={onCerrar}>
            <X strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
        <div className="rc-modal__body">{children}</div>
        <div className="rc-modal__footer">{pie}</div>
      </div>
    </div>
  );
}
