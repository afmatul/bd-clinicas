'use client';

import { Children, Fragment, isValidElement, useId, useRef, useState, type KeyboardEvent, type ReactElement, type ReactNode } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { Flotante } from './Flotante';

interface Opcion { valor: string; etiqueta: string; deshabilitada: boolean }

type PropsOption = { value?: string | number; disabled?: boolean; children?: ReactNode };

/** Lee los <option> hijos (también dentro de fragmentos y de .map) para que el uso sea igual al de <select>. */
function leerOpciones(hijos: ReactNode): Opcion[] {
  return Children.toArray(hijos).flatMap((h): Opcion[] => {
    if (!isValidElement(h)) return [];
    if (h.type === Fragment) return leerOpciones((h.props as { children?: ReactNode }).children);
    if (h.type !== 'option') return [];
    const p = (h as ReactElement<PropsOption>).props;
    const etiqueta = Children.toArray(p.children).join('');
    return [{ valor: String(p.value ?? etiqueta), etiqueta, deshabilitada: !!p.disabled }];
  });
}

/**
 * Lista desplegable con el estilo del design system (reemplaza al <select> nativo).
 * Se usa con los mismos <option> hijos; onChange recibe el valor. Con `name` agrega un campo oculto,
 * así los formularios que leen FormData siguen funcionando.
 */
export function Selector({
  children, value, defaultValue, onChange, name, id, disabled, invalido, pequeno, className = '', claseControl = '',
  'aria-label': ariaLabel, 'aria-describedby': ariaDescribedBy,
}: {
  children: ReactNode;
  value?: string;
  defaultValue?: string;
  onChange?: (valor: string) => void;
  name?: string;
  id?: string;
  disabled?: boolean;
  invalido?: boolean;
  pequeno?: boolean;
  /** Clases extra del texto (p. ej. rc-num). */
  className?: string;
  /** Clases extra del contenedor (p. ej. grow). */
  claseControl?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
}) {
  const opciones = leerOpciones(children);
  const [interno, setInterno] = useState(defaultValue ?? opciones[0]?.valor ?? '');
  const valor = value ?? interno;
  const actual = opciones.find((o) => o.valor === valor) ?? opciones[0];
  const [abierto, setAbierto] = useState(false);
  const [resaltada, setResaltada] = useState(0);
  const contenedor = useRef<HTMLDivElement>(null);
  const lista = useRef<HTMLDivElement>(null);
  const busqueda = useRef({ texto: '', hasta: 0 });
  const listaId = useId();

  const abrir = () => {
    if (disabled) return;
    setResaltada(Math.max(0, opciones.findIndex((o) => o.valor === actual?.valor)));
    setAbierto(true);
  };
  const elegir = (o: Opcion) => {
    if (o.deshabilitada) return;
    if (value === undefined) setInterno(o.valor);
    onChange?.(o.valor);
    setAbierto(false);
  };
  const mover = (delta: number) => {
    let i = resaltada;
    for (let n = 0; n < opciones.length; n++) {
      i = Math.min(opciones.length - 1, Math.max(0, i + delta));
      if (!opciones[i]!.deshabilitada) break;
    }
    setResaltada(i);
    lista.current?.querySelector(`[data-i="${i}"]`)?.scrollIntoView({ block: 'nearest' });
  };

  const alTeclear = (e: KeyboardEvent) => {
    if (disabled) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!abierto) abrir(); else mover(e.key === 'ArrowDown' ? 1 : -1);
    } else if (e.key === 'Home' || e.key === 'End') {
      if (abierto) { e.preventDefault(); setResaltada(e.key === 'Home' ? 0 : opciones.length - 1); }
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (abierto) elegir(opciones[resaltada]!); else abrir();
    } else if (e.key === 'Tab') {
      setAbierto(false);
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      // Escribir letras salta a la opción que empieza así (como un select).
      const b = busqueda.current, ahora = Date.now();
      b.texto = (ahora > b.hasta ? '' : b.texto) + e.key.toLowerCase();
      b.hasta = ahora + 700;
      const i = opciones.findIndex((o) => !o.deshabilitada && o.etiqueta.toLowerCase().startsWith(b.texto));
      if (i >= 0) { if (!abierto) abrir(); setResaltada(i); }
    }
  };

  return (
    <div ref={contenedor}
      className={`rc-control rc-control--select${pequeno ? ' rc-control--sm' : ''}${abierto ? ' is-open' : ''}${invalido ? ' is-error' : ''}${disabled ? ' is-disabled' : ''} ${claseControl}`.trim()}>
      <button
        type="button" id={id} className={`rc-input ${className}`.trim()} disabled={disabled}
        style={{ textAlign: 'left', cursor: disabled ? 'not-allowed' : 'pointer' }}
        role="combobox" aria-haspopup="listbox" aria-expanded={abierto} aria-controls={abierto ? listaId : undefined}
        aria-activedescendant={abierto ? `${listaId}-${resaltada}` : undefined}
        aria-label={ariaLabel} aria-describedby={ariaDescribedBy} aria-invalid={invalido || undefined}
        onClick={() => (abierto ? setAbierto(false) : abrir())} onKeyDown={alTeclear}
      >
        <span className="rc-value" style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{actual?.etiqueta ?? ''}</span>
      </button>
      <ChevronDown strokeWidth={1.75} className="rc-chevron" aria-hidden="true" />
      {name && <input type="hidden" name={name} value={actual?.valor ?? ''} />}
      {abierto && (
        <Flotante ancla={contenedor} igualarAncho onCerrar={() => setAbierto(false)}>
          <div ref={lista} id={listaId} className="rc-menu" role="listbox" aria-label={ariaLabel} style={{ maxHeight: '280px', overflowY: 'auto' }}>
            {opciones.map((o, i) => (
              <div
                key={`${o.valor}-${i}`} id={`${listaId}-${i}`} data-i={i} role="option" className={`rc-option${i === resaltada ? ' is-hover' : ''}`}
                aria-selected={o.valor === actual?.valor} aria-disabled={o.deshabilitada || undefined}
                onMouseEnter={() => !o.deshabilitada && setResaltada(i)}
                onMouseDown={(e) => { e.preventDefault(); elegir(o); }}
              >
                <span>{o.etiqueta}</span>
                {o.valor === actual?.valor && <Check strokeWidth={1.75} className="rc-check-icon" aria-hidden="true" />}
              </div>
            ))}
          </div>
        </Flotante>
      )}
    </div>
  );
}
