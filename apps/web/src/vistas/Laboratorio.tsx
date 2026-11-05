'use client';
// Vista "laboratorio" del prototipo, conectada a /api/laboratorio (MongoDB, Laboratorio clínico).
// La tabla de resultados y el formulario de captura se arman con el catálogo y las secciones
// que devuelve la API: cada tipo de examen trae sus propios campos.
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowDown, ArrowUp, Check, ChevronDown, CircleAlert, CircleCheck, Clock, FlaskConical, Info, Loader2, Pencil,
  Plus, Printer, Search, Send, ShieldCheck, Trash2, TriangleAlert, X,
} from 'lucide-react';
import type {
  CapturarResultadosInput, EstadoExamen, ExamenDetalle, ExamenResumen, Interpretacion, ListaExamenes,
  PacienteResumen, SeccionResultado, TipoExamen, TipoExamenClave,
} from '@red-clinica/shared';
import { useSesion } from '../lib/sesion';
import { useToast } from '../layout/Toasts';
import { capturarResultados, listarExamenes, obtenerExamen, ordenarExamen, tiposDeExamen, validarExamen } from '../api/laboratorio';
import { buscarPacientes } from '../api/pacientes';
import { MODO_DEMO } from '../datos/demo';
import { formatoCui, iniciales, varianteAvatar } from '../datos/formato';

const FILTROS: { clave: TipoExamenClave | undefined; texto: string }[] = [
  { clave: undefined, texto: 'Todos' },
  { clave: 'hematologia', texto: 'Hematología' },
  { clave: 'orina', texto: 'Orina' },
  { clave: 'urocultivo', texto: 'Cultivo' },
  { clave: 'quimica', texto: 'Química' },
];

// ---------- formatos ----------
const dos = (n: number) => String(n).padStart(2, '0');
const hora = (d: Date) => `${dos(d.getHours())}:${dos(d.getMinutes())}`;
const mismoDia = (a: Date, b: Date) => a.toDateString() === b.toDateString();
/** "Hoy 07:40" o "04/11 16:20", como la tabla del prototipo. */
function fechaCorta(iso: string) {
  const d = new Date(iso);
  return `${mismoDia(d, new Date()) ? 'Hoy' : `${dos(d.getDate())}/${dos(d.getMonth() + 1)}`} ${hora(d)}`;
}
const fechaLarga = (iso: string) => { const d = new Date(iso); return `${dos(d.getDate())}/${dos(d.getMonth() + 1)}/${d.getFullYear()} ${hora(d)}`; };
/** Hora sola si fue el mismo día de la muestra; si no, fecha corta. */
const horaRelativa = (iso: string, base: string) => (mismoDia(new Date(iso), new Date(base)) ? hora(new Date(iso)) : fechaCorta(iso));

// ---------- píldoras ----------
function PillEstado({ estado, critico }: { estado: EstadoExamen; critico: boolean }) {
  if (critico) return <span className="rc-pill rc-pill--danger"><TriangleAlert strokeWidth={1.75} aria-hidden="true" />Valor crítico</span>;
  if (estado === 'VALIDADO') return <span className="rc-pill rc-pill--success"><CircleCheck strokeWidth={1.75} aria-hidden="true" />Validado</span>;
  if (estado === 'EN_PROCESO') return <span className="rc-pill rc-pill--info"><Loader2 strokeWidth={1.75} aria-hidden="true" />En proceso</span>;
  return <span className="rc-pill "><Clock strokeWidth={1.75} aria-hidden="true" />Pendiente</span>;
}

const INTERPRETACION: Record<Interpretacion, [string, string, typeof Check]> = {
  NORMAL: ['rc-pill--success', 'Normal', Check],
  ALTO: ['rc-pill--warning', 'Alto', ArrowUp],
  BAJO: ['rc-pill--warning', 'Bajo', ArrowDown],
  CRITICO_ALTO: ['rc-pill--danger', 'Crítico alto', TriangleAlert],
  CRITICO_BAJO: ['rc-pill--danger', 'Crítico bajo', TriangleAlert],
  ANORMAL: ['rc-pill--warning', 'Anormal', CircleAlert],
  SENSIBLE: ['rc-pill--success', 'Sensible', Check],
  INTERMEDIO: ['rc-pill--warning', 'Intermedio', CircleAlert],
  RESISTENTE: ['rc-pill--danger', 'Resistente', X],
};
function PillInterpretacion({ i }: { i: Interpretacion | null }) {
  if (!i) return <span className="muted">—</span>;
  const [clase, texto, Icono] = INTERPRETACION[i];
  return <span className={`rc-pill ${clase}`}><Icono strokeWidth={1.75} aria-hidden="true" />{texto}</span>;
}
const fueraDeRango = (i: Interpretacion | null) => !!i && i !== 'NORMAL' && i !== 'SENSIBLE';

// ---------- tabla de resultados ----------
/** Una sola tabla de parámetros (con filas de sección si el tipo las tiene) y, aparte, el antibiograma. */
function TablaResultados({ secciones }: { secciones: SeccionResultado[] }) {
  const parametros = secciones.filter((s) => s.columnas === 'parametro');
  const antibiogramas = secciones.filter((s) => s.columnas === 'antibiograma');
  return (
    <>
      {parametros.length > 0 && (
        <div className="rc-table-wrap">
          <table className="rc-table">
            <thead>
              <tr><th>Parámetro</th><th className="rc-num">Resultado</th><th>Unidad</th><th className="rc-num">Referencia</th><th>Interpretación</th></tr>
            </thead>
            <tbody>
              {parametros.map((s) => [
                s.titulo && (
                  <tr key={`t-${s.titulo}`}><td colSpan={5}><span className="rc-overline">{s.titulo}</span></td></tr>
                ),
                ...s.filas.map((f) => (
                  <tr key={`${s.titulo}-${f.parametro}`}>
                    <td>{f.parametro}</td>
                    <td className="rc-num"><b className={fueraDeRango(f.interpretacion) ? 'hi' : undefined}>{f.valor}</b></td>
                    <td>{f.unidad ?? ''}</td>
                    <td className="rc-num muted">{f.referencia ?? '—'}</td>
                    <td><PillInterpretacion i={f.interpretacion} /></td>
                  </tr>
                )),
              ])}
            </tbody>
          </table>
        </div>
      )}
      {antibiogramas.map((s) => (
        <div className="rc-table-wrap" key={s.titulo}>
          <table className="rc-table">
            <thead><tr><th>{s.titulo}</th><th>Interpretación</th></tr></thead>
            <tbody>
              {s.filas.map((f) => <tr key={f.parametro}><td>{f.parametro}</td><td><PillInterpretacion i={f.interpretacion} /></td></tr>)}
            </tbody>
          </table>
        </div>
      ))}
    </>
  );
}

// ---------- formulario de captura (se arma con el catálogo) ----------
type Antibiograma = CapturarResultadosInput['antibiograma'];

/** Precarga el formulario a partir de las secciones ya capturadas. */
function valoresIniciales(tipo: TipoExamen, e: ExamenDetalle): Record<string, string> {
  const v: Record<string, string> = {};
  for (const c of tipo.campos) {
    const f = e.secciones.find((s) => s.titulo === c.seccion && s.columnas === 'parametro')?.filas.find((x) => x.parametro === c.nombre);
    if (f) v[c.clave] = f.valor;
  }
  return v;
}

function FormularioCaptura({ tipo, examen, onGuardado, onCancelar }: {
  tipo: TipoExamen; examen: ExamenDetalle; onGuardado: (e: ExamenDetalle) => void; onCancelar: () => void;
}) {
  const [valores, setValores] = useState<Record<string, string>>(() => valoresIniciales(tipo, examen));
  const [antibiograma, setAntibiograma] = useState<Antibiograma>(() =>
    ((examen.resultados?.antibiograma as Antibiograma | undefined) ?? []).map((a) => ({ ...a })));
  const [observaciones, setObservaciones] = useState(examen.observaciones ?? '');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const secciones = tipo.campos.reduce<{ titulo: string | null; campos: TipoExamen['campos'] }[]>((acc, c) => {
    const ultima = acc.at(-1);
    if (ultima && ultima.titulo === c.seccion) ultima.campos.push(c);
    else acc.push({ titulo: c.seccion, campos: [c] });
    return acc;
  }, []);
  const sinCrecimiento = tipo.clave === 'urocultivo' && /^sin crecimiento$/i.test((valores.organismo ?? '').trim());

  async function guardar(ev: FormEvent) {
    ev.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      onGuardado(await capturarResultados(examen.id, {
        valores, antibiograma: sinCrecimiento ? [] : antibiograma.filter((a) => a.antibiotico.trim()), observaciones: observaciones || undefined,
      }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form className="form" onSubmit={guardar} noValidate>
      {secciones.map((s) => (
        <div key={s.titulo ?? 'general'} className="col">
          {s.titulo && <span className="rc-overline">{s.titulo}</span>}
          <div className="grid2">
            {s.campos.map((c) => {
              const id = `cap-${c.clave}`;
              const valor = valores[c.clave] ?? '';
              const cambiar = (x: string) => setValores((v) => ({ ...v, [c.clave]: x }));
              const ayuda = c.tipo === 'numero'
                ? [c.refMin !== null && c.refMax !== null ? `Referencia ${c.refMin} – ${c.refMax}` : c.refMax !== null ? `Referencia < ${c.refMax}` : null].filter(Boolean)[0]
                : c.normal ? `Esperado: ${c.normal}` : null;
              return (
                <div className="rc-field" key={c.clave}>
                  <label className="rc-label" htmlFor={id}>
                    {c.nombre} {c.obligatorio && <span className="rc-req" aria-hidden="true">*</span>}
                  </label>
                  {c.tipo === 'opcion' ? (
                    <div className="rc-control rc-control--select">
                      <select className="rc-input" id={id} value={valor} onChange={(e) => cambiar(e.target.value)}>
                        <option value="">Sin dato</option>
                        {c.opciones?.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                      <ChevronDown strokeWidth={1.75} className="rc-chevron" aria-hidden="true" />
                    </div>
                  ) : (
                    <div className={`rc-control ${c.tipo === 'numero' ? 'rc-num' : ''}`}>
                      <input className="rc-input" id={id} value={valor} inputMode={c.tipo === 'numero' ? 'decimal' : undefined}
                        placeholder={c.tipo === 'texto' && c.normal ? c.normal : ''} onChange={(e) => cambiar(e.target.value)} />
                      {c.unidad && <span className="rc-affix">{c.unidad}</span>}
                    </div>
                  )}
                  {ayuda && <div className="rc-help">{ayuda}</div>}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {tipo.clave === 'urocultivo' && !sinCrecimiento && (
        <div className="col">
          <span className="rc-overline">Antibiograma</span>
          {antibiograma.map((a, i) => (
            <div className="row" key={i}>
              <div className="rc-control rc-control--sm grow">
                <input className="rc-input" aria-label="Antibiótico" placeholder="Antibiótico" value={a.antibiotico}
                  onChange={(e) => setAntibiograma((l) => l.map((x, j) => (j === i ? { ...x, antibiotico: e.target.value } : x)))} />
              </div>
              <div className="rc-control rc-control--select rc-control--sm">
                <select className="rc-input" aria-label="Interpretación" value={a.interpretacion}
                  onChange={(e) => setAntibiograma((l) => l.map((x, j) => (j === i ? { ...x, interpretacion: e.target.value as 'S' | 'I' | 'R' } : x)))}>
                  <option value="S">Sensible</option>
                  <option value="I">Intermedio</option>
                  <option value="R">Resistente</option>
                </select>
                <ChevronDown strokeWidth={1.75} className="rc-chevron" aria-hidden="true" />
              </div>
              <button type="button" className="rc-btn rc-btn--ghost rc-btn--neutral rc-btn--icon rc-btn--sm" aria-label="Quitar antibiótico"
                onClick={() => setAntibiograma((l) => l.filter((_, j) => j !== i))}>
                <Trash2 strokeWidth={1.75} aria-hidden="true" />
              </button>
            </div>
          ))}
          <div>
            <button type="button" className="rc-btn rc-btn--ghost rc-btn--sm" onClick={() => setAntibiograma((l) => [...l, { antibiotico: '', interpretacion: 'S' }])}>
              <Plus strokeWidth={1.75} aria-hidden="true" />
              Agregar antibiótico
            </button>
          </div>
        </div>
      )}

      <div className="rc-field">
        <label className="rc-label" htmlFor="cap-obs">Observaciones</label>
        <div className="rc-control rc-control--area">
          <textarea className="rc-input" id="cap-obs" rows={2} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
        </div>
      </div>

      {error && (
        <div className="rc-alert rc-alert--danger" role="alert">
          <CircleAlert strokeWidth={1.75} aria-hidden="true" />
          <div className="rc-alert__body"><span className="rc-alert__title">No pudimos guardar los resultados</span><span className="rc-alert__text">{error}</span></div>
        </div>
      )}
      <div className="rc-card__footer">
        <button type="button" className="rc-btn rc-btn--ghost" onClick={onCancelar}>Volver</button>
        <button type="submit" className={`rc-btn rc-btn--primary${guardando ? ' is-loading' : ''}`} disabled={guardando}>
          {guardando ? <span className="rc-spinner" aria-hidden="true" /> : <Check strokeWidth={1.75} aria-hidden="true" />}
          Guardar resultados
        </button>
      </div>
    </form>
  );
}

// ---------- detalle ----------
function Detalle({ examen, tipo, puedeCapturar, onCambio }: {
  examen: ExamenDetalle; tipo: TipoExamen | undefined; puedeCapturar: boolean; onCambio: (e: ExamenDetalle) => void;
}) {
  const toast = useToast();
  const [capturando, setCapturando] = useState(false);
  const [validando, setValidando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { setCapturando(false); setError(null); }, [examen.id]);

  const nombre = `${examen.paciente.nombres} ${examen.paciente.apellidos}`;
  const firma = examen.validadoPor
    ? ` · validado por ${examen.validadoPor.nombre} ${horaRelativa(examen.validadoPor.fecha, examen.fechaOrden)}`
    : examen.capturadoPor
      ? ` · capturado por ${examen.capturadoPor.nombre} ${horaRelativa(examen.capturadoPor.fecha, examen.fechaOrden)}`
      : '';
  const editable = puedeCapturar && examen.estado !== 'VALIDADO' && !MODO_DEMO;

  async function validar() {
    setValidando(true);
    setError(null);
    try {
      const e = await validarExamen(examen.id);
      onCambio(e);
      toast('Resultados validados', `${e.nombre} de ${nombre} quedó disponible para el médico.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setValidando(false);
    }
  }

  return (
    <section className="rc-card">
      <div className="rc-card__header">
        <div>
          <span className="rc-overline">{examen.nombre} · {examen.codigo}</span>
          <h2 className="rc-card__title">{nombre}</h2>
          <p className="rc-card__sub">Muestra {fechaLarga(examen.fechaOrden)}{firma}</p>
        </div>
        <PillEstado estado={examen.estado} critico={examen.critico} />
      </div>

      {examen.critico && (
        <div className="rc-alert rc-alert--danger" role="alert">
          <TriangleAlert strokeWidth={1.75} aria-hidden="true" />
          <div className="rc-alert__body">
            <span className="rc-alert__title">Valor crítico</span>
            <span className="rc-alert__text">Avise de inmediato al médico solicitante{examen.medicoSolicitante ? ` (${examen.medicoSolicitante})` : ''}.</span>
          </div>
        </div>
      )}

      {capturando && tipo ? (
        <FormularioCaptura tipo={tipo} examen={examen} onCancelar={() => setCapturando(false)}
          onGuardado={(e) => { setCapturando(false); onCambio(e); toast('Resultados guardados', `${e.nombre} de ${nombre} queda en proceso hasta que lo valide.`); }} />
      ) : (
        <>
          {examen.secciones.length ? <TablaResultados secciones={examen.secciones} /> : (
            <div className="rc-empty">
              <span className="rc-empty__icon"><FlaskConical strokeWidth={1.75} aria-hidden="true" /></span>
              <h3 className="rc-empty__title">Sin resultados todavía</h3>
              <p className="rc-empty__text">
                {tipo ? `Muestra: ${tipo.muestra}. ` : ''}Capture los resultados cuando el análisis esté listo.
              </p>
            </div>
          )}
          {examen.observaciones && <p className="muted">{examen.observaciones}</p>}
          <div className="rc-alert">
            <Info strokeWidth={1.75} aria-hidden="true" />
            <div className="rc-alert__body">
              <span className="rc-alert__title">Cada tipo de examen tiene sus propios campos</span>
              <span className="rc-alert__text">
                Una orina muestra aspecto, pH y sedimento; un cultivo, microorganismo y antibiograma. La tabla se arma con los campos del documento.
              </span>
            </div>
          </div>
          {error && (
            <div className="rc-alert rc-alert--danger" role="alert">
              <CircleAlert strokeWidth={1.75} aria-hidden="true" />
              <div className="rc-alert__body"><span className="rc-alert__title">No pudimos validar el examen</span><span className="rc-alert__text">{error}</span></div>
            </div>
          )}
          <div className="rc-card__footer">
            {examen.estado === 'VALIDADO' ? (
              <>
                <button className="rc-btn rc-btn--ghost" onClick={() => window.print()}>
                  <Printer strokeWidth={1.75} aria-hidden="true" />
                  Imprimir
                </button>
                <button className="rc-btn rc-btn--secondary" data-toast={`Envío pendiente|El aviso a ${examen.medicoSolicitante ?? 'el médico'} se conecta con el módulo de atención.`}>
                  <Send strokeWidth={1.75} aria-hidden="true" />
                  Enviar al médico
                </button>
              </>
            ) : editable ? (
              <>
                <button className="rc-btn rc-btn--secondary" onClick={() => setCapturando(true)} disabled={!tipo}>
                  {examen.estado === 'PENDIENTE' ? <Plus strokeWidth={1.75} aria-hidden="true" /> : <Pencil strokeWidth={1.75} aria-hidden="true" />}
                  {examen.estado === 'PENDIENTE' ? 'Capturar resultados' : 'Corregir resultados'}
                </button>
                {examen.estado === 'EN_PROCESO' && (
                  <button className={`rc-btn rc-btn--primary${validando ? ' is-loading' : ''}`} onClick={validar} disabled={validando}>
                    {validando ? <span className="rc-spinner" aria-hidden="true" /> : <ShieldCheck strokeWidth={1.75} aria-hidden="true" />}
                    Validar resultados
                  </button>
                )}
              </>
            ) : null}
          </div>
        </>
      )}
    </section>
  );
}

// ---------- modal: registrar examen ----------
function ModalRegistrar({ tipos, tipoInicial, onCerrar, onCreado }: {
  tipos: TipoExamen[]; tipoInicial: TipoExamenClave | undefined; onCerrar: () => void; onCreado: (id: string, codigo: string) => void;
}) {
  const [texto, setTexto] = useState('');
  const [opciones, setOpciones] = useState<PacienteResumen[]>([]);
  const [paciente, setPaciente] = useState<PacienteResumen | null>(null);
  const [tipo, setTipo] = useState<TipoExamenClave>(tipoInicial ?? tipos[0]?.clave ?? 'hematologia');
  const [solicitante, setSolicitante] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const buscar = useRef<HTMLInputElement>(null);

  useEffect(() => {
    buscar.current?.focus();
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar();
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onCerrar]);

  useEffect(() => {
    if (paciente || texto.trim().length < 2) { setOpciones([]); return; }
    let vigente = true;
    const t = setTimeout(() => {
      buscarPacientes({ q: texto.trim(), estado: 'ACTIVO', porPagina: 6 }).then((r) => vigente && setOpciones(r.items)).catch(() => undefined);
    }, 250);
    return () => { vigente = false; clearTimeout(t); };
  }, [texto, paciente]);

  async function registrar(ev: FormEvent) {
    ev.preventDefault();
    if (!paciente) { setError('Busque y elija al paciente.'); return; }
    setEnviando(true);
    setError(null);
    try {
      const r = await ordenarExamen({ idPaciente: paciente.id, tipo, medicoSolicitante: solicitante.trim() || undefined });
      onCreado(r.id, r.codigo);
    } catch (e) {
      setError((e as Error).message);
      setEnviando(false);
    }
  }

  return (
    <div className="rc-scrim" style={{ position: 'fixed', inset: 0 }} onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <form className="rc-modal" role="dialog" aria-modal="true" aria-labelledby="mr-titulo" onSubmit={registrar}>
        <div className="rc-modal__header">
          <div className="grow"><h2 className="rc-modal__title" id="mr-titulo">¿Qué examen va a registrar?</h2></div>
          <button type="button" className="rc-btn rc-btn--ghost rc-btn--neutral rc-btn--icon rc-btn--sm" aria-label="Cerrar" onClick={onCerrar}>
            <X strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
        <div className="rc-modal__body">
          <span>El examen queda <strong>Pendiente</strong> con la fecha y hora de la muestra. Los resultados se capturan después.</span>
          <div className="rc-field">
            <label className="rc-label" htmlFor="mr-paciente">Paciente <span className="rc-req" aria-hidden="true">*</span></label>
            {paciente ? (
              <div className="row">
                <div className="rc-person grow">
                  <span className={`rc-avatar ${varianteAvatar(paciente.id)}`}>{iniciales(paciente.nombres, paciente.apellidos)}</span>
                  <div className="rc-person__text">
                    <span className="rc-person__name">{paciente.nombres} {paciente.apellidos}</span>
                    <span className="rc-person__meta">CUI {formatoCui(paciente.cui)}</span>
                  </div>
                </div>
                <button type="button" className="rc-btn rc-btn--ghost rc-btn--sm" onClick={() => { setPaciente(null); setTexto(''); }}>Cambiar</button>
              </div>
            ) : (
              <>
                <div className="rc-control">
                  <Search strokeWidth={1.75} aria-hidden="true" />
                  <input ref={buscar} className="rc-input" id="mr-paciente" autoComplete="off" placeholder="Nombre o CUI"
                    value={texto} onChange={(e) => setTexto(e.target.value)} />
                </div>
                {opciones.length > 0 && (
                  <div className="rc-menu" role="listbox" aria-label="Pacientes encontrados">
                    {opciones.map((p) => (
                      <div key={p.id} className="rc-option" role="option" aria-selected={false} tabIndex={0}
                        onClick={() => setPaciente(p)} onKeyDown={(k) => (k.key === 'Enter' || k.key === ' ') && (k.preventDefault(), setPaciente(p))}>
                        {p.nombres} {p.apellidos}
                        <span className="rc-option__meta">{formatoCui(p.cui)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
          <div className="rc-field">
            <label className="rc-label" htmlFor="mr-tipo">Tipo de examen <span className="rc-req" aria-hidden="true">*</span></label>
            <div className="rc-control rc-control--select">
              <select className="rc-input" id="mr-tipo" value={tipo} onChange={(e) => setTipo(e.target.value as TipoExamenClave)}>
                {tipos.map((t) => <option key={t.clave} value={t.clave}>{t.nombre}</option>)}
              </select>
              <ChevronDown strokeWidth={1.75} className="rc-chevron" aria-hidden="true" />
            </div>
            <div className="rc-help">Muestra: {tipos.find((t) => t.clave === tipo)?.muestra}</div>
          </div>
          <div className="rc-field">
            <label className="rc-label" htmlFor="mr-medico">Médico solicitante</label>
            <div className="rc-control">
              <input className="rc-input" id="mr-medico" value={solicitante} onChange={(e) => setSolicitante(e.target.value)} placeholder="Opcional" />
            </div>
          </div>
          {error && <div className="rc-help"><span className="rc-help--error">{error}</span></div>}
        </div>
        <div className="rc-modal__footer">
          <button type="button" className="rc-btn rc-btn--ghost" onClick={onCerrar}>Volver</button>
          <button type="submit" className={`rc-btn rc-btn--primary${enviando ? ' is-loading' : ''}`} disabled={enviando}>
            {enviando ? <span className="rc-spinner" aria-hidden="true" /> : <Plus strokeWidth={1.75} aria-hidden="true" />}
            Registrar examen
          </button>
        </div>
      </form>
    </div>
  );
}

// ---------- vista ----------
export default function Laboratorio() {
  const { perfil } = useSesion();
  const toast = useToast();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tipo = (params.get('tipo') as TipoExamenClave | null) ?? undefined;
  const idSel = params.get('id');

  const [lista, setLista] = useState<ListaExamenes | null>(null);
  const [tipos, setTipos] = useState<TipoExamen[]>([]);
  const [detalle, setDetalle] = useState<ExamenDetalle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const puedeCapturar = perfil?.usuario.rol === 'MEDICO' || perfil?.usuario.rol === 'ADMIN';
  const cerrarModal = useCallback(() => setModal(false), []);

  const cambiar = useCallback((cambios: Record<string, string | undefined>) => {
    const p = new URLSearchParams(params);
    for (const [k, v] of Object.entries(cambios)) v ? p.set(k, v) : p.delete(k);
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  }, [params, pathname, router]);

  const cargar = useCallback(() => {
    setError(null);
    return listarExamenes({ tipo }).then(setLista).catch((e: Error) => setError(e.message));
  }, [tipo]);

  useEffect(() => { void cargar(); }, [cargar]);
  useEffect(() => { tiposDeExamen().then(setTipos).catch(() => undefined); }, []);

  // Sin selección en la URL, se abre el primero de la lista (como el prototipo).
  const seleccionado = idSel ?? lista?.items[0]?.id ?? null;
  useEffect(() => {
    if (!seleccionado) { setDetalle(null); return; }
    let vigente = true;
    obtenerExamen(seleccionado).then((d) => vigente && setDetalle(d)).catch((e: Error) => vigente && setError(e.message));
    return () => { vigente = false; };
  }, [seleccionado]);

  /** Tras capturar o validar, actualiza el detalle y la fila sin recargar la página. */
  function alCambiar(e: ExamenDetalle) {
    setDetalle(e);
    void cargar();
  }

  const subtitulo = lista
    ? `${perfil?.institucion.nombre ?? 'Laboratorio clínico'} · ${lista.ultimas48h} ${lista.ultimas48h === 1 ? 'examen' : 'exámenes'} en las últimas 48 h`
    : perfil?.institucion.nombre;

  return (
    <div className="view">
      <header className="ph">
        <div className="ph__row">
          <div className="ph__text">
            <h1 className="h1">Resultados de laboratorio</h1>
            <p>{subtitulo}</p>
          </div>
          <div className="ph__actions">
            <button className="rc-btn rc-btn--primary" onClick={MODO_DEMO ? undefined : () => setModal(true)} disabled={!MODO_DEMO && !tipos.length}
              {...(MODO_DEMO ? { 'data-toast': 'Modo demostración|Registrar exámenes necesita la API y MongoDB.' } : {})}>
              <Plus strokeWidth={1.75} aria-hidden="true" />
              Registrar examen
            </button>
          </div>
        </div>
      </header>
      <div className="rc-toolbar">
        <div className="rc-segmented" role="group" aria-label="Tipo de examen" data-controlado>
          {FILTROS.map((f) => (
            <button key={f.texto} aria-pressed={tipo === f.clave} onClick={() => cambiar({ tipo: f.clave, id: undefined })}>{f.texto}</button>
          ))}
        </div>
      </div>
      {error && (
        <div className="rc-alert rc-alert--danger" role="alert">
          <CircleAlert strokeWidth={1.75} aria-hidden="true" />
          <div className="rc-alert__body"><span className="rc-alert__title">No pudimos cargar los exámenes</span><span className="rc-alert__text">{error}</span></div>
        </div>
      )}
      <div className="split rev">
        <section className="rc-table-wrap">
          <table className="rc-table">
            <thead>
              <tr>
                <th>Paciente y examen</th>
                <th className="hide-sm">Fecha</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {!lista && !error && Array.from({ length: 4 }, (_, i) => (
                <tr key={i}><td colSpan={3}><span className="rc-skeleton" style={{ display: 'block', height: '20px' }} /></td></tr>
              ))}
              {lista?.items.map((e: ExamenResumen) => (
                <tr key={e.id} style={{ cursor: 'pointer' }} aria-selected={e.id === seleccionado} tabIndex={0}
                  onClick={() => cambiar({ id: e.id })} onKeyDown={(k) => (k.key === 'Enter' || k.key === ' ') && cambiar({ id: e.id })}>
                  <td>
                    <div className="rc-person">
                      <span className={`rc-avatar ${varianteAvatar(e.paciente.id)}`}>{iniciales(e.paciente.nombres, e.paciente.apellidos)}</span>
                      <div className="rc-person__text">
                        {/* La columna es angosta (split 5/7): el nombre puede ocupar dos líneas para no cortar el estado. */}
                        <span className="rc-person__name" style={{ whiteSpace: 'normal' }}>{e.paciente.nombres} {e.paciente.apellidos}</span>
                        <span className="rc-person__meta">{e.nombre}</span>
                      </div>
                    </div>
                  </td>
                  <td className="rc-num hide-sm">{fechaCorta(e.fechaActualizacion)}</td>
                  <td style={{ whiteSpace: 'nowrap', width: '1%' }}><PillEstado estado={e.estado} critico={e.critico} /></td>
                </tr>
              ))}
              {lista && !lista.items.length && (
                <tr><td colSpan={3}>
                  <div className="rc-empty">
                    <span className="rc-empty__icon"><FlaskConical strokeWidth={1.75} aria-hidden="true" /></span>
                    <h3 className="rc-empty__title">No hay exámenes {tipo ? 'de este tipo' : 'registrados'}</h3>
                    <p className="rc-empty__text">Registre la muestra del paciente para empezar.</p>
                  </div>
                </td></tr>
              )}
            </tbody>
          </table>
        </section>
        {detalle ? (
          <Detalle examen={detalle} tipo={tipos.find((t) => t.clave === detalle.tipo)} puedeCapturar={puedeCapturar} onCambio={alCambiar} />
        ) : (
          lista?.items.length ? <section className="rc-card"><span className="rc-skeleton" style={{ display: 'block', height: '240px' }} /></section> : null
        )}
      </div>
      {modal && (
        <ModalRegistrar tipos={tipos} tipoInicial={tipo} onCerrar={cerrarModal}
          onCreado={(id, codigo) => {
            setModal(false);
            toast('Examen registrado', `${codigo} quedó pendiente de resultados.`);
            void cargar();
            cambiar({ id });
          }} />
      )}
    </div>
  );
}
