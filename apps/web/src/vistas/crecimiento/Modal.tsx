'use client';

import { useEffect, useRef, type FormEvent, type ReactNode } from 'react';
import { X } from 'lucide-react';

/**
 * Modal del design system (rc-scrim + rc-modal) con formulario: Esc cierra, el foco queda
 * atrapado dentro y vuelve al botón que lo abrió.
 */
export function ModalFormulario(props: {
  titulo: string;
  icono: ReactNode;
  enviando: boolean;
  textoEnviar: string;
  error?: string | null;
  onCerrar(): void;
  onEnviar(e: FormEvent<HTMLFormElement>): void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLFormElement>(null);
  const cerrar = useRef(props.onCerrar);
  cerrar.current = props.onCerrar;

  useEffect(() => {
    const previo = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>('input, select, textarea')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cerrar.current();
      if (e.key !== 'Tab' || !ref.current) return;
      const f = [...ref.current.querySelectorAll<HTMLElement>('button, input, select, textarea')].filter((x) => !x.hasAttribute('disabled'));
      const [primero, ultimo] = [f[0], f[f.length - 1]];
      if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo?.focus(); }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero?.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); previo?.focus(); };
  }, []);

  return (
    <div className="rc-scrim" style={{ position: 'fixed', inset: 0 }} onMouseDown={(e) => e.target === e.currentTarget && props.onCerrar()}>
      <form ref={ref} className="rc-modal" role="dialog" aria-modal="true" aria-labelledby="modal-titulo" noValidate onSubmit={props.onEnviar}
        style={{ width: '520px', maxHeight: 'calc(100vh - 48px)', overflowY: 'auto' }}>
        <div className="rc-modal__header">
          <span className="rc-modal__icon" style={{ background: 'var(--primary-soft)', color: 'var(--on-primary-soft)' }}>{props.icono}</span>
          <div style={{ flex: 1 }}><h2 className="rc-modal__title" id="modal-titulo">{props.titulo}</h2></div>
          <button type="button" className="rc-btn rc-btn--ghost rc-btn--neutral rc-btn--icon rc-btn--sm" aria-label="Cerrar" onClick={props.onCerrar}>
            <X strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
        <div className="rc-modal__body" style={{ paddingTop: 'var(--space-5)' }}>
          {props.error && (
            <div className="rc-alert rc-alert--danger" role="alert">
              <div className="rc-alert__body"><span className="rc-alert__text">{props.error}</span></div>
            </div>
          )}
          {props.children}
        </div>
        <div className="rc-modal__footer">
          <button type="button" className="rc-btn rc-btn--ghost" onClick={props.onCerrar}>Volver</button>
          <button type="submit" className={`rc-btn rc-btn--primary${props.enviando ? ' is-loading' : ''}`} disabled={props.enviando}>
            {props.enviando && <span className="rc-spinner" aria-hidden="true" />}
            {props.textoEnviar}
          </button>
        </div>
      </form>
    </div>
  );
}

/** Campo del design system: etiqueta, control y ayuda o error con id `${id}-ayuda` (el input lo enlaza con aria-describedby). */
export function Campo(props: {
  id: string; etiqueta: string; opcional?: boolean; requerido?: boolean; ayuda?: string; error?: string; affix?: string; clase?: string; children: ReactNode;
}) {
  const desc = props.error || props.ayuda ? `${props.id}-ayuda` : undefined;
  return (
    <div className="rc-field">
      <label className="rc-label" htmlFor={props.id}>
        {props.etiqueta}
        {props.requerido && <> <span className="rc-req" aria-hidden="true">*</span></>}
        {props.opcional && <> <span className="rc-opt">(opcional)</span></>}
      </label>
      <div className={`rc-control${props.clase ? ` ${props.clase}` : ''}${props.error ? ' is-error' : ''}`}>
        {props.children}
        {props.affix && <span className="rc-affix">{props.affix}</span>}
      </div>
      {desc && <div className={`rc-help${props.error ? ' rc-help--error' : ''}`} id={desc}>{props.error ?? props.ayuda}</div>}
    </div>
  );
}
