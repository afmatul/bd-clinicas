'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { Flotante } from './Flotante';
import { ahoraLocal, fechaCorta } from '../datos/formato';

type Vista = 'dias' | 'meses' | 'anios';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS_SEMANA = ['lu', 'ma', 'mi', 'ju', 'vi', 'sá', 'do'];
const ANIOS_POR_PAGINA = 12;
const MS_DIA = 86_400_000;
const FECHA_VALIDA = /^\d{4}-\d{2}-\d{2}$/;
const nombreCompleto = new Intl.DateTimeFormat('es-GT', { timeZone: 'UTC', dateStyle: 'full' });

const iso = (anio: number, mes: number, dia: number) => new Date(Date.UTC(anio, mes, dia)).toISOString().slice(0, 10);
const partes = (f: string) => ({ anio: Number(f.slice(0, 4)), mes: Number(f.slice(5, 7)) - 1, dia: Number(f.slice(8, 10)) });
const mayus = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const desplazar = (f: string, dias: number) => new Date(Date.parse(`${f}T00:00:00Z`) + dias * MS_DIA).toISOString().slice(0, 10);
const diaSemana = (f: string) => (new Date(`${f}T00:00:00Z`).getUTCDay() + 6) % 7;
const sumarMeses = (f: string, n: number) => {
  const { anio, mes, dia } = partes(f);
  const ultimo = new Date(Date.UTC(anio, mes + n + 1, 0)).getUTCDate();
  return iso(anio, mes + n, Math.min(dia, ultimo));
};

/**
 * Calendario con el estilo del design system (reemplaza a <input type="date">).
 * Recibe y entrega fechas ISO (AAAA-MM-DD); respeta min y max. Teclado: flechas mueven el día,
 * Re Pág/Av Pág el mes, Enter elige y Esc cierra. Con `name` agrega un campo oculto para FormData.
 */
export function SelectorFecha({
  value, defaultValue, onChange, name, id, min, max, disabled, required, invalido, pequeno, className = '', claseControl = '',
  placeholder = 'dd/mm/aaaa', 'aria-label': ariaLabel, 'aria-describedby': ariaDescribedBy,
}: {
  value?: string;
  defaultValue?: string;
  onChange?: (fecha: string) => void;
  name?: string;
  id?: string;
  min?: string;
  max?: string;
  disabled?: boolean;
  required?: boolean;
  invalido?: boolean;
  pequeno?: boolean;
  className?: string;
  claseControl?: string;
  placeholder?: string;
  'aria-label'?: string;
  'aria-describedby'?: string;
}) {
  const [interno, setInterno] = useState(defaultValue ?? '');
  const valor = value ?? interno;
  const seleccionada = FECHA_VALIDA.test(valor) ? valor : '';
  const hoy = ahoraLocal().fecha;
  const [abierto, setAbierto] = useState(false);
  const [vista, setVista] = useState<Vista>('dias');
  const [foco, setFoco] = useState(hoy);
  const [mostrado, setMostrado] = useState(partes(hoy));
  const [paginaAnios, setPaginaAnios] = useState(0);
  const contenedor = useRef<HTMLDivElement>(null);
  const capa = useRef<HTMLDivElement>(null);
  const dialogoId = useId();

  const dentro = (f: string) => (!min || f >= min) && (!max || f <= max);
  const acotar = (f: string) => (min && f < min ? min : max && f > max ? max : f);

  const abrir = () => {
    if (disabled) return;
    const base = acotar(seleccionada || hoy);
    setFoco(base);
    setMostrado(partes(base));
    setVista('dias');
    setPaginaAnios(0);
    setAbierto(true);
  };
  const cerrar = () => setAbierto(false);
  const fijar = (f: string) => {
    if (value === undefined) setInterno(f);
    onChange?.(f);
    cerrar();
    contenedor.current?.querySelector('button')?.focus();
  };

  // Al abrir (y al mover el foco con el teclado) el día enfocado recibe el foco real.
  useEffect(() => {
    if (abierto && vista === 'dias') capa.current?.querySelector<HTMLElement>(`[data-f="${foco}"]`)?.focus();
  }, [abierto, vista, foco]);

  const irA = (f: string) => {
    const destino = acotar(f);
    setFoco(destino);
    setMostrado(partes(destino));
  };
  const alTeclear = (e: KeyboardEvent) => {
    const paso: Record<string, string> = {
      ArrowLeft: desplazar(foco, -1), ArrowRight: desplazar(foco, 1), ArrowUp: desplazar(foco, -7), ArrowDown: desplazar(foco, 7),
      PageUp: sumarMeses(foco, e.shiftKey ? -12 : -1), PageDown: sumarMeses(foco, e.shiftKey ? 12 : 1),
      Home: desplazar(foco, -diaSemana(foco)), End: desplazar(foco, 6 - diaSemana(foco)),
    };
    const destino = paso[e.key];
    if (!destino) return;
    e.preventDefault();
    irA(destino);
  };

  const { anio, mes } = mostrado;
  const primero = Date.UTC(anio, mes, 1);
  const desfase = (new Date(primero).getUTCDay() + 6) % 7;
  const celdas = Array.from({ length: 42 }, (_, i) => new Date(primero + (i - desfase) * MS_DIA).toISOString().slice(0, 10));
  const tabDia = celdas.includes(foco) ? foco : iso(anio, mes, 1);
  const inicioAnios = Math.floor(anio / ANIOS_POR_PAGINA) * ANIOS_POR_PAGINA + paginaAnios * ANIOS_POR_PAGINA;
  const mesPermitido = (a: number, m: number) => (!min || iso(a, m + 1, 0) >= min) && (!max || iso(a, m, 1) <= max);
  const anioPermitido = (a: number) => (!min || iso(a, 11, 31) >= min) && (!max || iso(a, 0, 1) <= max);

  const navegar = (delta: number) => {
    if (vista === 'dias') setMostrado(partes(sumarMeses(iso(anio, mes, 1), delta)));
    else if (vista === 'meses') setMostrado({ anio: anio + delta, mes, dia: 1 });
    else setPaginaAnios((p) => p + delta);
  };
  const titulo = vista === 'dias' ? `${mayus(MESES[mes]!)} ${anio}` : vista === 'meses' ? String(anio) : `${inicioAnios} – ${inicioAnios + ANIOS_POR_PAGINA - 1}`;
  const subirVista = () => { if (vista === 'dias') setVista('meses'); else if (vista === 'meses') { setPaginaAnios(0); setVista('anios'); } };
  const botonNav = 'rc-btn rc-btn--ghost rc-btn--neutral rc-btn--icon rc-btn--sm';
  const celdaGrande = { justifyContent: 'center', padding: '0 var(--space-2)', minHeight: '40px' } as const;
  const fila7 = { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' } as const;
  const fila3 = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2px' } as const;

  return (
    <div ref={contenedor}
      className={`rc-control${pequeno ? ' rc-control--sm' : ''}${invalido ? ' is-error' : ''}${disabled ? ' is-disabled' : ''} ${claseControl}`.trim()}>
      <CalendarDays strokeWidth={1.75} aria-hidden="true" />
      <button
        type="button" id={id} className={`rc-input ${className}`.trim()} disabled={disabled}
        style={{ textAlign: 'left', cursor: disabled ? 'not-allowed' : 'pointer', color: seleccionada ? undefined : 'var(--ink-subtle)' }}
        aria-haspopup="dialog" aria-expanded={abierto} aria-controls={abierto ? dialogoId : undefined}
        aria-label={ariaLabel} aria-describedby={ariaDescribedBy} aria-invalid={invalido || undefined}
        onClick={() => (abierto ? cerrar() : abrir())}
      >
        {seleccionada ? fechaCorta(seleccionada) : placeholder}
      </button>
      {name && <input type="hidden" name={name} value={seleccionada} />}
      {abierto && (
        <Flotante ancla={contenedor} onCerrar={cerrar}>
          <div ref={capa} id={dialogoId} className="rc-menu" role="dialog" aria-label="Elegir fecha"
            style={{ width: 'min(300px, calc(100vw - 16px))', padding: 'var(--space-3)', gap: 'var(--space-2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-1)' }}>
              <button type="button" className={botonNav} aria-label="Anterior" onClick={() => navegar(-1)}><ChevronLeft strokeWidth={1.75} aria-hidden="true" /></button>
              <button type="button" className="rc-btn rc-btn--ghost rc-btn--sm" aria-live="polite" disabled={vista === 'anios'} onClick={subirVista}>{titulo}</button>
              <button type="button" className={botonNav} aria-label="Siguiente" onClick={() => navegar(1)}><ChevronRight strokeWidth={1.75} aria-hidden="true" /></button>
            </div>

            {vista === 'dias' && (
              <div role="grid" aria-label={titulo} onKeyDown={alTeclear}>
                <div role="row" style={fila7}>
                  {DIAS_SEMANA.map((d) => (
                    <span key={d} role="columnheader" className="rc-option__meta" style={{ textAlign: 'center', margin: 0, textTransform: 'uppercase' }}>{d}</span>
                  ))}
                </div>
                {Array.from({ length: 6 }, (_, fila) => (
                  <div key={fila} role="row" style={{ ...fila7, marginTop: '2px' }}>
                    {celdas.slice(fila * 7, fila * 7 + 7).map((f) => {
                      const habilitado = dentro(f);
                      return (
                        <button
                          key={f} type="button" role="gridcell" data-f={f} className="rc-option rc-num"
                          tabIndex={f === tabDia ? 0 : -1} aria-selected={f === seleccionada}
                          aria-disabled={!habilitado || undefined} aria-current={f === hoy ? 'date' : undefined}
                          aria-label={nombreCompleto.format(new Date(`${f}T00:00:00Z`))}
                          style={{
                            justifyContent: 'center', padding: 0, minHeight: '36px',
                            color: habilitado && partes(f).mes !== mes ? 'var(--ink-subtle)' : undefined,
                            boxShadow: f === hoy ? 'inset 0 0 0 1px var(--primary)' : undefined,
                          }}
                          onClick={() => habilitado && fijar(f)}
                        >
                          {partes(f).dia}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}

            {vista === 'meses' && (
              <div style={fila3}>
                {MESES.map((nombre, m) => (
                  <button key={nombre} type="button" className="rc-option"
                    aria-selected={!!seleccionada && partes(seleccionada).anio === anio && partes(seleccionada).mes === m}
                    aria-disabled={!mesPermitido(anio, m) || undefined} style={celdaGrande}
                    onClick={() => { if (!mesPermitido(anio, m)) return; setMostrado({ anio, mes: m, dia: 1 }); setVista('dias'); }}>
                    {mayus(nombre.slice(0, 3))}
                  </button>
                ))}
              </div>
            )}

            {vista === 'anios' && (
              <div style={fila3}>
                {Array.from({ length: ANIOS_POR_PAGINA }, (_, i) => inicioAnios + i).map((a) => (
                  <button key={a} type="button" className="rc-option rc-num"
                    aria-selected={!!seleccionada && partes(seleccionada).anio === a}
                    aria-disabled={!anioPermitido(a) || undefined} style={celdaGrande}
                    onClick={() => { if (!anioPermitido(a)) return; setMostrado({ anio: a, mes, dia: 1 }); setPaginaAnios(0); setVista('meses'); }}>
                    {a}
                  </button>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-2)' }}>
              <button type="button" className="rc-btn rc-btn--ghost rc-btn--sm" disabled={!dentro(hoy)} onClick={() => fijar(hoy)}>Hoy</button>
              {!required && seleccionada && <button type="button" className="rc-btn rc-btn--ghost rc-btn--sm" onClick={() => fijar('')}>Borrar</button>}
            </div>
          </div>
        </Flotante>
      )}
    </div>
  );
}
