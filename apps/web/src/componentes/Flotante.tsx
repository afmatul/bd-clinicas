'use client';

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';

const SEPARACION_PX = 4;
const MARGEN_PANTALLA_PX = 8;

/**
 * Capa flotante anclada a un elemento (menús, listas y calendarios). Se dibuja en el body con
 * posición fija, así no la recorta una tabla con scroll ni un modal. Se cierra al hacer clic
 * fuera, al pulsar Esc, al redimensionar o al desplazar la página.
 */
export function Flotante({
  ancla, onCerrar, igualarAncho = false, alinear = 'inicio', children, ...aria
}: {
  ancla: RefObject<HTMLElement | null>;
  onCerrar: () => void;
  igualarAncho?: boolean;
  alinear?: 'inicio' | 'fin';
  children: ReactNode;
  id?: string;
  role?: string;
  'aria-label'?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const capa = useRef<HTMLDivElement>(null);
  const [posicion, setPosicion] = useState<CSSProperties>({ position: 'fixed', top: 0, left: 0, visibility: 'hidden' });
  const cerrar = useRef(onCerrar);
  cerrar.current = onCerrar;

  // Se mide en cada render (el contenido puede cambiar de tamaño) y solo se actualiza si cambió.
  useLayoutEffect(() => {
    const a = ancla.current, c = capa.current;
    if (!a || !c) return;
    const r = a.getBoundingClientRect();
    const alto = c.offsetHeight, ancho = c.offsetWidth;
    const abajo = window.innerHeight - r.bottom, arriba = r.top;
    const subir = abajo < alto + SEPARACION_PX && arriba > abajo;
    const izquierda = alinear === 'fin' ? r.right - ancho : r.left;
    const left = Math.max(MARGEN_PANTALLA_PX, Math.min(izquierda, window.innerWidth - ancho - MARGEN_PANTALLA_PX));
    const top = subir ? Math.max(MARGEN_PANTALLA_PX, r.top - alto - SEPARACION_PX) : r.bottom + SEPARACION_PX;
    const minWidth = igualarAncho ? r.width : undefined;
    setPosicion((p) => (p.left === left && p.top === top && p.minWidth === minWidth && p.visibility === 'visible'
      ? p
      : { position: 'fixed', left, top, minWidth, visibility: 'visible' }));
  });

  useEffect(() => {
    const fuera = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!capa.current?.contains(t) && !ancla.current?.contains(t)) cerrar.current();
    };
    const tecla = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      cerrar.current();
      ancla.current?.querySelector<HTMLElement>('button, input')?.focus();
    };
    const mover = (e: Event) => { if (!capa.current?.contains(e.target as Node)) cerrar.current(); };
    const cierre = () => cerrar.current();
    document.addEventListener('mousedown', fuera);
    document.addEventListener('keydown', tecla, true);
    window.addEventListener('scroll', mover, true);
    window.addEventListener('resize', cierre);
    return () => {
      document.removeEventListener('mousedown', fuera);
      document.removeEventListener('keydown', tecla, true);
      window.removeEventListener('scroll', mover, true);
      window.removeEventListener('resize', cierre);
    };
  }, [ancla]);

  return createPortal(
    <div ref={capa} {...aria} style={{ ...posicion, zIndex: 'calc(var(--z-modal) + 1)', ...aria.style }}>
      {children}
    </div>,
    document.body,
  );
}
