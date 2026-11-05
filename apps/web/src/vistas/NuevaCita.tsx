'use client';
// Vista "nueva-cita" del prototipo, conectada a /api/agenda (horarios libres y alta) y /api/pacientes.
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { CalendarDays, ChevronDown, ChevronRight, Info, ShieldAlert, TriangleAlert, X } from 'lucide-react';
import type { CitaDetalle, PacienteFicha, PacienteResumen } from '@red-clinica/shared';
import { useSesion } from '../lib/sesion';
import { useToast } from '../layout/Toasts';
import { ApiError } from '../api/cliente';
import { buscarPacientes } from '../api/pacientes';
import { fichaPaciente } from '../api/atencion';
import {
  agendar, disponibilidad, listarEspecialidades, listarMedicos, nombreProfesional, proximasDelPaciente,
  type Especialidad, type Profesional,
} from '../api/agenda';
import { Buscador } from '../componentes/Buscador';
import { ahoraLocal, edad, fechaSinAnio, formatoCui, formatoSangre, formatoTelefono, iniciales, varianteAvatar } from '../datos/formato';

const MAX_MOTIVO = 300;
const SEVERIDAD: Record<string, string> = { LEVE: 'leve', MODERADA: 'moderada', SEVERA: 'severa' };

const buscarPacientesActivos = (q: string) => buscarPacientes({ q, estado: 'ACTIVO', porPagina: 8 }).then((r) => r.items);

export default function NuevaCita() {
  const { perfil } = useSesion();
  const toast = useToast();
  const router = useRouter();
  const params = useSearchParams();
  const hoy = ahoraLocal().fecha;
  const esHospital = perfil?.institucion.clave === 'hospital';

  const [paciente, setPaciente] = useState<PacienteFicha | null>(null);
  const [proximas, setProximas] = useState<CitaDetalle[]>([]);
  const [medicos, setMedicos] = useState<Profesional[] | null>(null);
  const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);
  const [idEspecialidad, setIdEspecialidad] = useState('');
  const [idMedico, setIdMedico] = useState(params.get('medico') ?? perfil?.usuario.idPersonal ?? '');
  const [fecha, setFecha] = useState(params.get('fecha') && params.get('fecha')! >= hoy ? params.get('fecha')! : hoy);
  const [hora, setHora] = useState(params.get('hora') ?? '');
  const [libres, setLibres] = useState<Record<string, string[]>>({});
  const [motivo, setMotivo] = useState('');
  const [sms, setSms] = useState(true);
  const [correo, setCorreo] = useState(false);
  const [error, setError] = useState<{ titulo: string; texto: string; campos?: Record<string, string> } | null>(null);
  const [guardando, setGuardando] = useState(false);

  const elegirPaciente = useCallback((id: string) => {
    setError(null);
    fichaPaciente(id).then(setPaciente).catch((e: Error) => setError({ titulo: 'No pudimos abrir la ficha', texto: e.message }));
    proximasDelPaciente(id).then(setProximas).catch(() => setProximas([]));
  }, []);

  useEffect(() => {
    const id = params.get('paciente');
    if (id) elegirPaciente(id);
  }, [params, elegirPaciente]);

  useEffect(() => {
    if (!perfil) return;
    listarMedicos(perfil).then((m) => {
      setMedicos(m);
      setIdMedico((actual) => (actual && m.some((x) => x.id === actual) ? actual : m[0]?.id ?? ''));
    }).catch((e: Error) => setError({ titulo: 'No pudimos cargar los médicos', texto: e.message }));
    if (perfil.institucion.clave === 'hospital') listarEspecialidades().then(setEspecialidades).catch(() => undefined);
  }, [perfil]);

  const visibles = useMemo(
    () => (medicos ?? []).filter((m) => !idEspecialidad || m.especialidades.some((e) => e.id === idEspecialidad)),
    [medicos, idEspecialidad],
  );

  // Horarios libres de cada médico visible en la fecha (para "· 3 libres" y para la lista de horas).
  const cargarLibres = useCallback(() => {
    if (!visibles.length || !fecha) return;
    let vigente = true;
    Promise.all(visibles.map((m) => disponibilidad(m.id, fecha).then((d) => [m.id, d.libres] as const).catch(() => [m.id, []] as const)))
      .then((pares) => vigente && setLibres(Object.fromEntries(pares)));
    return () => { vigente = false; };
  }, [visibles, fecha]);
  useEffect(() => cargarLibres(), [cargarLibres]);

  const horas = libres[idMedico] ?? [];
  useEffect(() => {
    if (libres[idMedico] && !horas.includes(hora)) setHora(horas[0] ?? '');
  }, [libres, idMedico, horas, hora]);

  const medico = medicos?.find((m) => m.id === idMedico);
  const especialidad = especialidades.find((e) => e.id === idEspecialidad);
  const telefono = paciente?.telefonos[0] ?? null;

  async function guardar() {
    setError(null);
    if (!paciente) return setError({ titulo: 'Falta el paciente', texto: 'Busque al paciente por nombre o CUI.' });
    if (!hora) return setError({ titulo: 'Sin horario', texto: 'El médico no tiene horarios libres ese día. Elija otra fecha u otro médico.' });
    setGuardando(true);
    try {
      await agendar({ idPaciente: paciente.id, idMedico, idEspecialidad: esHospital && idEspecialidad ? idEspecialidad : undefined, fecha, hora, motivo });
      toast('Cita programada', `${fechaSinAnio(fecha)}, ${hora}${medico ? ` con ${nombreProfesional(medico)}` : ''}.`);
      router.push(`/citas?${new URLSearchParams({ fecha, medico: idMedico })}`);
    } catch (e) {
      const err = e as ApiError;
      setError({ titulo: err.status === 409 ? 'Ese horario se acaba de ocupar' : 'No se guardó la cita', texto: err.message, campos: err.campos });
      if (err.status === 409) cargarLibres();
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="view">
      <header className="ph">
        <ol className="rc-breadcrumbs" aria-label="Ruta">
          <li>
            <Link href="/citas">Citas</Link>
            <ChevronRight strokeWidth={1.75} aria-hidden="true" />
          </li>
          <li><span aria-current="page">Nueva cita</span></li>
        </ol>
        <div className="ph__row">
          <div className="ph__text">
            <h1 className="h1">Nueva cita</h1>
            <p>{perfil?.institucion.nombre}{especialidad ? ` · ${especialidad.nombre}` : ''}</p>
          </div>
          <div className="ph__actions" />
        </div>
      </header>
      <div className="split">
        <form className="rc-card form" onSubmit={(e) => { e.preventDefault(); void guardar(); }}>
          <h2 className="rc-card__title">Datos de la cita</h2>
          {error && (
            <div className="rc-alert rc-alert--danger" role="alert">
              <TriangleAlert strokeWidth={1.75} aria-hidden="true" />
              <div className="rc-alert__body">
                <span className="rc-alert__title">{error.titulo}</span>
                <span className="rc-alert__text">{error.texto}{error.campos && Object.values(error.campos).length ? ` ${Object.values(error.campos).join(' ')}` : ''}</span>
              </div>
            </div>
          )}
          <div className="rc-field">
            <label className="rc-label" htmlFor="nc1">Paciente <span className="rc-req" aria-hidden="true">*</span></label>
            {paciente ? (
              <div className="rc-control">
                <span className="rc-value">{paciente.nombres} {paciente.apellidos}</span>
                <span className="rc-affix rc-num">CUI {formatoCui(paciente.cui)}</span>
                <button type="button" className="rc-btn rc-btn--ghost rc-btn--neutral rc-btn--icon rc-btn--sm" aria-label="Cambiar paciente"
                  onClick={() => { setPaciente(null); setProximas([]); }}>
                  <X strokeWidth={1.75} aria-hidden="true" />
                </button>
              </div>
            ) : (
              <Buscador<PacienteResumen>
                id="nc1" etiqueta="Paciente" placeholder="Buscar por nombre o CUI" buscar={buscarPacientesActivos}
                sinResultados="Sin pacientes activos que coincidan."
                opcion={(p) => ({ clave: p.id, titulo: `${p.nombres} ${p.apellidos}`, meta: `CUI ${formatoCui(p.cui)}` })}
                onElegir={(p) => elegirPaciente(p.id)}
              />
            )}
          </div>
          <div className="grid2">
            <div className="rc-field">
              <label className="rc-label" htmlFor="nc2">Fecha <span className="rc-req" aria-hidden="true">*</span></label>
              <div className="rc-control">
                <CalendarDays strokeWidth={1.75} aria-hidden="true" />
                <input className="rc-input rc-num" id="nc2" type="date" min={hoy} value={fecha} required onChange={(e) => setFecha(e.target.value)} />
              </div>
            </div>
            <div className="rc-field">
              <label className="rc-label" htmlFor="nc3">Hora <span className="rc-req" aria-hidden="true">*</span></label>
              <div className="rc-control rc-control--select">
                <select className="rc-input rc-num" id="nc3" value={hora} onChange={(e) => setHora(e.target.value)} disabled={!horas.length}>
                  {!horas.length && <option value="">{libres[idMedico] ? 'Sin horarios libres' : 'Cargando…'}</option>}
                  {horas.map((h) => <option key={h}>{h}</option>)}
                </select>
                <ChevronDown strokeWidth={1.75} className="rc-chevron" aria-hidden="true" />
              </div>
              <div className="rc-help">Se muestran solo horarios libres.</div>
            </div>
            {esHospital && (
              <div className="rc-field">
                <label className="rc-label" htmlFor="nc4">Especialidad</label>
                <div className="rc-control rc-control--select">
                  <select className="rc-input" id="nc4" value={idEspecialidad} onChange={(e) => setIdEspecialidad(e.target.value)}>
                    <option value="">Todas las especialidades</option>
                    {especialidades.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                  </select>
                  <ChevronDown strokeWidth={1.75} className="rc-chevron" aria-hidden="true" />
                </div>
              </div>
            )}
            <div className="rc-field">
              <label className="rc-label" htmlFor="nc5">Médico <span className="rc-req" aria-hidden="true">*</span></label>
              <div className="rc-control rc-control--select">
                <select className="rc-input" id="nc5" value={idMedico} onChange={(e) => setIdMedico(e.target.value)}>
                  {!medicos && <option value="">Cargando…</option>}
                  {medicos && !visibles.length && <option value="">Sin médicos en esta especialidad</option>}
                  {visibles.map((m) => (
                    <option key={m.id} value={m.id}>{nombreProfesional(m)}{libres[m.id] ? ` · ${libres[m.id]!.length} libres` : ''}</option>
                  ))}
                </select>
                <ChevronDown strokeWidth={1.75} className="rc-chevron" aria-hidden="true" />
              </div>
            </div>
          </div>
          <div className="rc-field">
            <label className="rc-label" htmlFor="nc6">Motivo <span className="rc-req" aria-hidden="true">*</span></label>
            <div className="rc-control rc-control--area">
              <textarea className="rc-input" id="nc6" rows={3} required minLength={3} maxLength={MAX_MOTIVO} value={motivo}
                placeholder="Control de hipertensión y revisión de tratamiento." onChange={(e) => setMotivo(e.target.value)} />
            </div>
            <div className="rc-help"><span /><span className="rc-count">{motivo.length} / {MAX_MOTIVO}</span></div>
          </div>
          <div className="rc-field">
            <span className="rc-label">Recordatorio</span>
            <div className="row">
              <label className="rc-switch">
                <input type="checkbox" role="switch" checked={sms && !!telefono} disabled={!telefono} onChange={(e) => setSms(e.target.checked)} />
                <span>{telefono ? `SMS al ${formatoTelefono(telefono)}` : 'SMS (sin teléfono)'}</span>
              </label>
              <label className="rc-switch">
                <input type="checkbox" role="switch" checked={correo && !!paciente?.emails.length} disabled={!paciente?.emails.length} onChange={(e) => setCorreo(e.target.checked)} />
                <span>Correo</span>
              </label>
            </div>
          </div>
          <div className="rc-card__footer">
            <Link className="rc-btn rc-btn--ghost" href="/citas">Cancelar</Link>
            <button className="rc-btn rc-btn--primary" type="submit" disabled={guardando || !paciente || !hora || !idMedico}>
              {guardando ? 'Guardando…' : 'Guardar cita'}
            </button>
          </div>
        </form>
        <aside className="col">
          <div className="rc-card">
            <h2 className="rc-card__title">Paciente</h2>
            {paciente ? (
              <>
                <div className="rc-person">
                  <span className={`rc-avatar ${varianteAvatar(paciente.id)}`}>{iniciales(paciente.nombres, paciente.apellidos)}</span>
                  <div className="rc-person__text">
                    <span className="rc-person__name">{paciente.nombres} {paciente.apellidos}</span>
                    <span className="rc-person__meta">{edad(paciente.fechaNacimiento)} años · {formatoSangre(paciente.tipoSangre)} · Exp. {paciente.id}</span>
                  </div>
                </div>
                {paciente.alergias.length > 0 && (
                  <div className="tags">
                    {paciente.alergias.map((a) => (
                      <span key={a.id} className={`rc-tag ${a.severidad === 'SEVERA' ? 'rc-tag--danger' : 'rc-tag--warning'}`}>
                        <ShieldAlert strokeWidth={1.75} aria-hidden="true" />
                        {a.descripcion ?? a.tipo}{a.severidad ? ` · ${SEVERIDAD[a.severidad]}` : ''}
                      </span>
                    ))}
                  </div>
                )}
              </>
            ) : <span className="muted small">Busque al paciente para ver sus datos y alergias.</span>}
          </div>
          {proximas.map((c) => (
            <div className="rc-alert" key={c.id}>
              <Info strokeWidth={1.75} aria-hidden="true" />
              <div className="rc-alert__body">
                <span className="rc-alert__title">Ya tiene una cita</span>
                <span className="rc-alert__text">
                  {c.estado === 'CONFIRMADA' ? 'Confirmada' : 'Programada'} para el {fechaSinAnio(c.fecha).toLowerCase()} a las {c.hora}. Guardar esta cita no la reemplaza.
                </span>
              </div>
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
}
