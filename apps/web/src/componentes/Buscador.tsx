'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Search } from 'lucide-react';

/**
 * Campo de búsqueda con lista desplegable (rc-control + rc-menu + rc-option del design system).
 * Busca mientras se escribe (con pausa de 250 ms); flechas, Enter y Esc funcionan como en un combobox.
 */
export function Buscador<T>({
  id, etiqueta, placeholder, buscar, opcion, onElegir, buscarVacio = false, autoFocus, sinResultados = 'Sin resultados.',
}: {
  id: string;
  etiqueta: string;
  placeholder: string;
  buscar: (q: string) => Promise<T[]>;
  opcion: (t: T) => { clave: string; titulo: ReactNode; meta?: ReactNode };
  onElegir: (t: T) => void;
  /** Mostrar resultados al enfocar aunque no se haya escrito nada. */
  buscarVacio?: boolean;
  autoFocus?: boolean;
  sinResultados?: string;
}) {
  const [q, setQ] = useState('');
  const [abierto, setAbierto] = useState(false);
  const [items, setItems] = useState<T[] | null>(null);
  const [activo, setActivo] = useState(0);
  const listaId = useId();
  const raiz = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto || (!q.trim() && !buscarVacio)) { setItems(null); return; }
    let vigente = true;
    const t = setTimeout(() => {
      buscar(q.trim()).then((r) => { if (vigente) { setItems(r); setActivo(0); } }).catch(() => vigente && setItems([]));
    }, 250);
    return () => { vigente = false; clearTimeout(t); };
  }, [q, abierto, buscar, buscarVacio]);

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => { if (!raiz.current?.contains(e.target as Node)) setAbierto(false); };
    document.addEventListener('mousedown', fuera);
    return () => document.removeEventListener('mousedown', fuera);
  }, [abierto]);

  const elegir = (t: T) => { onElegir(t); setQ(''); setAbierto(false); };

  return (
    <div ref={raiz} style={{ position: 'relative' }}>
      <div className="rc-control">
        <Search strokeWidth={1.75} aria-hidden="true" />
        <input
          className="rc-input" id={id} value={q} placeholder={placeholder} autoComplete="off" autoFocus={autoFocus}
          role="combobox" aria-label={etiqueta} aria-expanded={abierto && !!items} aria-controls={listaId} aria-autocomplete="list"
          onFocus={() => setAbierto(true)}
          onChange={(e) => { setQ(e.target.value); setAbierto(true); }}
          onKeyDown={(e) => {
            if (!items?.length) return;
            if (e.key === 'ArrowDown') { e.preventDefault(); setActivo((a) => Math.min(a + 1, items.length - 1)); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setActivo((a) => Math.max(a - 1, 0)); }
            else if (e.key === 'Enter') { e.preventDefault(); elegir(items[activo]!); }
            else if (e.key === 'Escape') setAbierto(false);
          }}
        />
      </div>
      {abierto && items && (
        <div className="rc-menu" id={listaId} role="listbox" style={{ position: 'absolute', left: 0, right: 0, top: 'calc(100% + 4px)', maxHeight: '280px', overflowY: 'auto' }}>
          {items.length === 0 && <span className="rc-option" aria-disabled="true">{sinResultados}</span>}
          {items.map((t, i) => {
            const o = opcion(t);
            return (
              <div key={o.clave} className={`rc-option${i === activo ? ' is-hover' : ''}`} role="option" aria-selected={false}
                onMouseEnter={() => setActivo(i)} onMouseDown={(e) => { e.preventDefault(); elegir(t); }}>
                <span>{o.titulo}</span>
                {o.meta && <span className="rc-option__meta">{o.meta}</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
