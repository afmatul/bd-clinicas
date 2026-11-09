'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';

/** Pausa entre la última tecla y la búsqueda. */
export const PAUSA_BUSQUEDA_MS = 300;

/**
 * Campo de búsqueda en vivo: llama a onBuscar PAUSA_BUSQUEDA_MS después de la última tecla
 * (Enter busca de inmediato). Si el valor cambia desde fuera (p. ej. "Limpiar filtros"),
 * el campo lo refleja sin pisar lo que la persona sigue escribiendo.
 */
export function CampoBusqueda({
  valor, onBuscar, placeholder, etiqueta, className = 'rc-control rc-control--sm grow', autoFocus,
}: {
  valor: string;
  onBuscar: (texto: string) => void;
  placeholder: string;
  etiqueta: string;
  className?: string;
  autoFocus?: boolean;
}) {
  const [texto, setTexto] = useState(valor);
  const ultimoEmitido = useRef(valor);
  const temporizador = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const alBuscar = useRef(onBuscar);
  alBuscar.current = onBuscar;

  useEffect(() => {
    if (valor !== ultimoEmitido.current) { ultimoEmitido.current = valor; setTexto(valor); }
  }, [valor]);
  useEffect(() => () => clearTimeout(temporizador.current), []);

  const emitir = (t: string) => {
    clearTimeout(temporizador.current);
    const limpio = t.trim();
    if (limpio === ultimoEmitido.current) return;
    ultimoEmitido.current = limpio;
    alBuscar.current(limpio);
  };

  return (
    <form className={className} role="search" onSubmit={(e) => { e.preventDefault(); emitir(texto); }}>
      <Search strokeWidth={1.75} aria-hidden="true" />
      <input
        className="rc-input" type="search" name="q" value={texto} placeholder={placeholder} aria-label={etiqueta}
        autoComplete="off" autoFocus={autoFocus}
        onChange={(e) => {
          setTexto(e.target.value);
          clearTimeout(temporizador.current);
          const t = e.target.value;
          temporizador.current = setTimeout(() => emitir(t), PAUSA_BUSQUEDA_MS);
        }}
      />
      {texto && (
        <button type="button" className="rc-btn rc-btn--ghost rc-btn--neutral rc-btn--icon rc-btn--sm" aria-label="Borrar búsqueda"
          onClick={() => { setTexto(''); emitir(''); }}>
          <X strokeWidth={1.75} aria-hidden="true" />
        </button>
      )}
    </form>
  );
}
