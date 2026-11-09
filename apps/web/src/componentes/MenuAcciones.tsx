'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { MoreVertical } from 'lucide-react';
import { Flotante } from './Flotante';

export interface AccionMenu {
  clave: string;
  etiqueta: string;
  icono?: ReactNode;
  /** Si trae enlace, la opción navega; si no, ejecuta onSelect. */
  href?: string;
  onSelect?: () => void;
  peligro?: boolean;
}

/** Botón de tres puntos con su menú. Flechas, Inicio/Fin, Enter y Esc funcionan como en un menú nativo. */
export function MenuAcciones({ etiqueta, acciones }: { etiqueta: string; acciones: AccionMenu[] }) {
  const [abierto, setAbierto] = useState(false);
  const boton = useRef<HTMLSpanElement>(null);
  const capa = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (abierto) capa.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
  }, [abierto]);

  if (acciones.length === 0) return null;

  const mover = (e: React.KeyboardEvent) => {
    const items = [...(capa.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
    const i = items.indexOf(document.activeElement as HTMLElement);
    const destino = e.key === 'ArrowDown' ? (i + 1) % items.length
      : e.key === 'ArrowUp' ? (i - 1 + items.length) % items.length
        : e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : -1;
    if (destino < 0) return;
    e.preventDefault();
    items[destino]?.focus();
  };

  return (
    <span ref={boton} style={{ display: 'inline-flex' }}>
      <button
        type="button" className="rc-btn rc-btn--ghost rc-btn--neutral rc-btn--icon rc-btn--sm" aria-label={etiqueta}
        aria-haspopup="menu" aria-expanded={abierto} aria-controls={abierto ? menuId : undefined}
        onClick={() => setAbierto((a) => !a)}
        onKeyDown={(e) => { if (e.key === 'ArrowDown' && !abierto) { e.preventDefault(); setAbierto(true); } }}
      >
        <MoreVertical strokeWidth={1.75} aria-hidden="true" />
      </button>
      {abierto && (
        <Flotante ancla={boton} alinear="fin" onCerrar={() => setAbierto(false)}>
          <div ref={capa} id={menuId} className="rc-menu" role="menu" aria-label={etiqueta} style={{ minWidth: '200px' }}
            onKeyDown={mover}>
            {acciones.map((a) => {
              const estilo = a.peligro ? { color: 'var(--danger)' } : undefined;
              const contenido = <>{a.icono}{a.etiqueta}</>;
              return a.href
                ? <Link key={a.clave} className="rc-option" role="menuitem" href={a.href} style={estilo} onClick={() => setAbierto(false)}>{contenido}</Link>
                : <button key={a.clave} type="button" className="rc-option" role="menuitem" style={{ ...estilo, width: '100%', textAlign: 'left' }}
                  onClick={() => { setAbierto(false); a.onSelect?.(); }}>{contenido}</button>;
            })}
          </div>
        </Flotante>
      )}
    </span>
  );
}
