'use client';
// Vista "recepcion" del prototipo (solo Clínica odontológica · CouchDB), conectada a /api/odontologia/recepcion.
import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Check, CircleCheck, Phone, Search, UserPlus } from 'lucide-react';
import { Selector } from '../componentes/Selector';
import { MOTIVOS_RECEPCION, type RecepcionDelDia, type Turno } from '@red-clinica/shared';
import { useSesion } from '../lib/sesion';
import { useToast } from '../layout/Toasts';
import { ApiError } from '../api/cliente';
import { marcarLlegada, obtenerRecepcion, registroRapido } from '../api/odontologia';
import { iniciales } from '../datos/formato';

/** Único diccionario estado de la cita → pill (StatusPill: mismos nombres que la base de datos). */
function pillDeTurno(t: Turno): ReactNode {
  const esperando = t.estado === 'PROGRAMADA' || t.estado === 'CONFIRMADA';
  if (esperando && t.llegada) {
    return <span className="rc-pill rc-pill--accent rc-pill--live"><span className="rc-pill__dot" />En sala de espera</span>;
  }
  switch (t.estado) {
    case 'ATENDIDA':
      return <span className="rc-pill rc-pill--success"><Check strokeWidth={1.75} aria-hidden="true" />Atendida</span>;
    case 'EN_CONSULTA':
      return <span className="rc-pill rc-pill--accent rc-pill--live"><span className="rc-pill__dot" />En consulta</span>;
    case 'CONFIRMADA':
      return <span className="rc-pill rc-pill--info"><CircleCheck strokeWidth={1.75} aria-hidden="true" />Confirmada</span>;
    case 'NO_ASISTIO':
      return <span className="rc-pill rc-pill--warning"><span className="rc-pill__dot" />No asistió</span>;
    case 'CANCELADA':
      return <span className="rc-pill rc-pill--danger"><span className="rc-pill__dot" />Cancelada</span>;
    default:
      return <span className="rc-pill"><span className="rc-pill__dot" />Programada</span>;
  }
}

/** "jueves 5 de noviembre" a partir de yyyy-mm-dd, sin desfase de zona horaria. */
function fechaLarga(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  const f = new Date(y, m - 1, d);
  const dia = new Intl.DateTimeFormat('es-GT', { weekday: 'long' }).format(f);
  const mes = new Intl.DateTimeFormat('es-GT', { month: 'long' }).format(f);
  return `${dia} ${d} de ${mes}`;
}

/** dd/mm/aaaa → yyyy-mm-dd; null si no es una fecha real. */
function fechaISO(texto: string): string | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(texto.trim());
  if (!m) return null;
  const [d, mes, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const f = new Date(y, mes - 1, d);
  if (f.getFullYear() !== y || f.getMonth() !== mes - 1 || f.getDate() !== d) return null;
  return `${y}-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

const sinAcentos = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

interface Formulario { nombre: string; telefono: string; nacimiento: string; motivo: string; asignar: boolean }
const VACIO: Formulario = { nombre: '', telefono: '', nacimiento: '', motivo: '', asignar: true };

export default function Recepcion() {
  const { perfil } = useSesion();
  const toast = useToast();
  const [datos, setDatos] = useState<RecepcionDelDia | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState('');
  const [marcando, setMarcando] = useState<string | null>(null);

  const [form, setForm] = useState<Formulario>(VACIO);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  const rol = perfil?.usuario.rol;
  const puedeMarcarLlegada = rol === 'RECEPCION' || rol === 'ENFERMERIA' || rol === 'ADMIN';

  const cargar = useCallback(() => {
    return obtenerRecepcion()
      .then((d) => { setDatos(d); setError(null); })
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    void cargar();
    // La sala cambia durante el día (otra secretaria registra, el odontólogo atiende): se refresca cada minuto.
    const id = setInterval(() => void cargar(), 60_000);
    return () => clearInterval(id);
  }, [cargar]);

  const turnos = useMemo(() => {
    if (!datos) return [];
    const q = sinAcentos(filtro.trim());
    if (!q) return datos.turnos;
    return datos.turnos.filter((t) => t.paciente && sinAcentos(`${t.paciente.nombres} ${t.paciente.apellidos}`).includes(q));
  }, [datos, filtro]);

  const activos = datos?.turnos.filter((t) => t.estado !== 'CANCELADA').length ?? 0;
  const odontologos = datos?.odontologos ?? [];
  const subtitulo = datos
    ? `${activos} ${activos === 1 ? 'paciente' : 'pacientes'} · ${odontologos.length === 1 ? odontologos[0]!.nombre : `${odontologos.length} odontólogos`}`
    : 'Cargando turnos…';
  const libre = datos?.siguienteLibre ?? null;

  async function llegada(t: Turno) {
    setMarcando(t.id);
    try {
      const { llegada } = await marcarLlegada(t.id);
      setDatos((d) => d && { ...d, turnos: d.turnos.map((x) => (x.id === t.id ? { ...x, llegada } : x)) });
      toast('Llegada registrada', `${t.paciente ? `${t.paciente.nombres} ${t.paciente.apellidos}` : 'El paciente'} está en sala de espera.`);
    } catch (e) {
      setError((e as Error).message);
      void cargar();
    } finally {
      setMarcando(null);
    }
  }

  async function registrar(e: FormEvent) {
    e.preventDefault();
    setErrorForm(null);
    const locales: Record<string, string> = {};
    const nacimiento = fechaISO(form.nacimiento);
    if (form.nombre.trim().split(/\s+/).filter(Boolean).length < 2) locales.nombreCompleto = 'Escriba al menos un nombre y un apellido.';
    if (form.telefono.replace(/\D/g, '').length !== 8) locales.telefono = 'El teléfono debe tener 8 dígitos.';
    if (!nacimiento) locales.fechaNacimiento = 'Use el formato dd/mm/aaaa.';
    if (!form.motivo) locales.motivo = 'Seleccione el motivo.';
    setErrores(locales);
    if (Object.keys(locales).length) return;

    setEnviando(true);
    try {
      const asignarTurno = form.asignar && !!libre;
      const r = await registroRapido({
        nombreCompleto: form.nombre,
        telefono: form.telefono,
        fechaNacimiento: nacimiento!,
        motivo: form.motivo as (typeof MOTIVOS_RECEPCION)[number],
        asignarTurno,
      });
      if (r.turno) toast('Paciente registrado', `Turno de las ${r.turno.hora} con ${r.turno.odontologo}.`);
      else if (asignarTurno) toast('Paciente registrado', 'Ya no quedan turnos libres hoy. Agéndelo desde Citas.');
      else toast('Paciente registrado', 'Complete su ficha cuando tenga los demás datos.');
      setForm(VACIO);
      setErrores({});
      await cargar();
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.campos).length) setErrores(err.campos);
      else setErrorForm((err as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  const campo = (k: keyof Formulario) => ({
    value: form[k] as string,
    onChange: (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value })),
  });
  const ayudaError = (k: string) =>
    errores[k] ? <div className="rc-help" id={`rr-${k}-error`}><span className="rc-help--error">{errores[k]}</span></div> : null;

  return (
    <div className="view">
      <header className="ph">
        <div className="ph__row">
          <div className="ph__text">
            <h1 className="h1">Recepción</h1>
            <p>{perfil?.institucion.nombre ?? 'Clínica odontológica'}{datos ? ` · ${fechaLarga(datos.fecha)}` : ''}</p>
          </div>
          <div className="ph__actions" />
        </div>
      </header>
      {error && (
        <div className="rc-alert rc-alert--danger" role="alert">
          <div className="rc-alert__body"><span className="rc-alert__title">No pudimos actualizar la recepción</span><span className="rc-alert__text">{error}</span></div>
        </div>
      )}
      <div className="split">
        <section className="rc-card">
          <div className="rc-card__header">
            <div>
              <h2 className="rc-card__title">Turnos de hoy</h2>
              <p className="rc-card__sub">{subtitulo}</p>
            </div>
            <div className="rc-control rc-control--sm" style={{ width: '220px', maxWidth: '100%' }}>
              <Search strokeWidth={1.75} aria-hidden="true" />
              <input className="rc-input" placeholder="Buscar paciente" aria-label="Buscar paciente" value={filtro} onChange={(e) => setFiltro(e.target.value)} />
            </div>
          </div>
          <div className="queue" aria-busy={!datos}>
            {!datos && !error && [0, 1, 2].map((i) => (
              <div className="qrow" key={i}>
                <span className="rc-skeleton" style={{ height: '12px', width: '40px' }} />
                <div className="rc-person">
                  <span className="rc-skeleton" style={{ width: '36px', height: '36px', borderRadius: '50%' }} />
                  <div className="rc-person__text">
                    <span className="rc-skeleton" style={{ height: '12px', width: '70%' }} />
                    <span className="rc-skeleton" style={{ height: '10px', width: '45%' }} />
                  </div>
                </div>
              </div>
            ))}
            {datos && turnos.length === 0 && (
              <div className="rc-empty" style={{ padding: '32px 24px' }}>
                <span className="rc-empty__icon"><Search strokeWidth={1.75} aria-hidden="true" /></span>
                <h3 className="rc-empty__title">{filtro ? 'Sin coincidencias' : 'Sin turnos hoy'}</h3>
                <p className="rc-empty__text">
                  {filtro ? `No hay turnos de hoy para “${filtro}”.` : 'Registre a un paciente a la derecha para darle el siguiente turno libre.'}
                </p>
                {filtro && <button className="rc-btn rc-btn--ghost rc-btn--sm" onClick={() => setFiltro('')}>Limpiar búsqueda</button>}
              </div>
            )}
            {turnos.map((t) => {
              const esperaLlegada = (t.estado === 'PROGRAMADA' || t.estado === 'CONFIRMADA') && !t.llegada;
              const nombre = t.paciente ? `${t.paciente.nombres} ${t.paciente.apellidos}` : 'Paciente sin expediente';
              return (
                <div className="qrow" key={t.id}>
                  <span className="rc-num slot__h">{t.hora}</span>
                  <div className="rc-person">
                    <span className="rc-avatar rc-avatar--accent">{t.paciente ? iniciales(t.paciente.nombres, t.paciente.apellidos) : '?'}</span>
                    <div className="rc-person__text">
                      <span className="rc-person__name">{nombre}</span>
                      <span className="rc-person__meta">
                        {t.motivo ?? 'Sin motivo'}{odontologos.length > 1 ? ` · ${t.odontologo}` : ''}
                      </span>
                    </div>
                  </div>
                  {pillDeTurno(t)}
                  <div className="qact">
                    {esperaLlegada && puedeMarcarLlegada && (
                      <button className="rc-btn rc-btn--soft rc-btn--sm" disabled={marcando === t.id} onClick={() => void llegada(t)}>
                        {marcando === t.id ? 'Marcando…' : 'Marcar llegada'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
        <aside className="col">
          <form className="rc-card form" onSubmit={registrar} noValidate>
            <h2 className="rc-card__title">Registro rápido</h2>
            <p className="rc-card__sub" style={{ marginTop: '-8px' }}>Solo lo necesario para atender hoy; el resto se completa después.</p>
            {errorForm && (
              <div className="rc-alert rc-alert--danger" role="alert">
                <div className="rc-alert__body"><span className="rc-alert__title">No pudimos registrar al paciente</span><span className="rc-alert__text">{errorForm}</span></div>
              </div>
            )}
            <div className="rc-field">
              <label className="rc-label" htmlFor="rr1">Nombre completo <span className="rc-req" aria-hidden="true">*</span></label>
              <div className={`rc-control${errores.nombreCompleto ? ' is-error' : ''}`}>
                <input className="rc-input" id="rr1" placeholder="Ej. Paola Lima Cruz" autoComplete="off" required
                  aria-invalid={!!errores.nombreCompleto} aria-describedby={errores.nombreCompleto ? 'rr-nombreCompleto-error' : undefined} {...campo('nombre')} />
              </div>
              {ayudaError('nombreCompleto')}
            </div>
            <div className="grid2">
              <div className="rc-field">
                <label className="rc-label" htmlFor="rr2">Teléfono <span className="rc-req" aria-hidden="true">*</span></label>
                <div className={`rc-control${errores.telefono ? ' is-error' : ''}`}>
                  <Phone strokeWidth={1.75} aria-hidden="true" />
                  <input className="rc-input" id="rr2" placeholder="5512 4478" inputMode="tel" required
                    aria-invalid={!!errores.telefono} aria-describedby={errores.telefono ? 'rr-telefono-error' : undefined} {...campo('telefono')} />
                </div>
                {ayudaError('telefono')}
              </div>
              <div className="rc-field">
                {/* La base de la clínica exige fecha de nacimiento en todo expediente (design doc de CouchDB). */}
                <label className="rc-label" htmlFor="rr3">Fecha de nacimiento <span className="rc-req" aria-hidden="true">*</span></label>
                <div className={`rc-control${errores.fechaNacimiento ? ' is-error' : ''}`}>
                  <input className="rc-input rc-num" id="rr3" placeholder="dd/mm/aaaa" inputMode="numeric" required
                    aria-invalid={!!errores.fechaNacimiento} aria-describedby={errores.fechaNacimiento ? 'rr-fechaNacimiento-error' : undefined} {...campo('nacimiento')} />
                </div>
                {ayudaError('fechaNacimiento')}
              </div>
            </div>
            <div className="rc-field">
              <label className="rc-label" htmlFor="rr4">Motivo <span className="rc-req" aria-hidden="true">*</span></label>
              <Selector id="rr4" invalido={!!errores.motivo} value={form.motivo as string}
                onChange={(v) => setForm((f) => ({ ...f, motivo: v }))}>
                <option value="">Seleccione una opción</option>
                {MOTIVOS_RECEPCION.map((m) => <option key={m} value={m}>{m}</option>)}
              </Selector>
              {ayudaError('motivo')}
            </div>
            <label className={`rc-check${libre ? '' : ' is-disabled'}`}>
              <input type="checkbox" checked={form.asignar && !!libre} disabled={!libre}
                onChange={(e) => setForm((f) => ({ ...f, asignar: e.target.checked }))} />
              <span>
                {libre
                  ? `Asignar al siguiente turno libre (${libre.hora}${odontologos.length > 1 ? `, ${libre.odontologo}` : ''})`
                  : datos ? 'Sin turnos libres hoy' : 'Asignar al siguiente turno libre'}
              </span>
            </label>
            <button className="rc-btn rc-btn--primary rc-btn--lg rc-btn--block" type="submit" disabled={enviando}>
              <UserPlus strokeWidth={1.75} aria-hidden="true" />
              {enviando ? 'Registrando…' : form.asignar && libre ? 'Registrar y dar turno' : 'Registrar paciente'}
            </button>
          </form>
        </aside>
      </div>
    </div>
  );
}
