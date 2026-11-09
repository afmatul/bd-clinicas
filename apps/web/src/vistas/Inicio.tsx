'use client';
// Inicio: saludo (sesión + módulo personal), pacientes activos (módulo pacientes) y la agenda de hoy (módulo agenda).
// La agenda se refresca sola cada minuto y al volver a la pestaña.
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, CalendarX, CircleCheck, Clock, Plus, Search, Stethoscope, Users, X } from 'lucide-react';
import { ESTADOS_ACTIVOS, type CitaDetalle } from '@red-clinica/shared';
import { useSesion } from '../lib/sesion';
import { miPerfilProfesional } from '../api/personal';
import { buscarPacientes } from '../api/pacientes';
import { agenda, listarMedicos, nombreProfesional, type Profesional } from '../api/agenda';
import { PillCita } from '../componentes/EstadoCita';
import { useAccionesCita } from '../componentes/AccionesCita';
import { Selector } from '../componentes/Selector';
import { ahoraLocal, formatoCui, formatoNumero, iniciales, varianteAvatar } from '../datos/formato';

const REFRESCO_AGENDA_MS = 60_000;
const PROXIMAS_VISIBLES = 4;

const fechaLarga = new Intl.DateTimeFormat('es-GT', { timeZone: 'America/Guatemala', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

/** "Dra. Ana Lucía Pérez" → "Dra. Pérez"; sin título, el primer nombre. */
function tratamiento(nombre: string) {
  const m = /^(Dra?\.|Lic\.)\s*(.+)$/.exec(nombre);
  if (!m) return nombre.split(' ')[0];
  return `${m[1]} ${m[2]!.split(/\s+/).at(-1)}`;
}

function saludo(hora = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Guatemala', hour: 'numeric', hour12: false }).format(new Date()))) {
  return hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches';
}

export default function Inicio() {
  const { perfil } = useSesion();
  const [especialidad, setEspecialidad] = useState<string | null>(null);
  const [activos, setActivos] = useState<number | null>(null);
  const [medicos, setMedicos] = useState<Profesional[] | null>(null);
  const [medicoElegido, setMedicoElegido] = useState<string | null>(null);
  const [citas, setCitas] = useState<CitaDetalle[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ahora, setAhora] = useState(() => ahoraLocal());

  const idMedico = medicoElegido ?? perfil?.usuario.idPersonal ?? medicos?.[0]?.id ?? null;
  // El ADMIN actúa con todos los roles (demostración), médico incluido.
  const esMedico = (perfil?.usuario.rol === 'MEDICO' || perfil?.usuario.rol === 'ADMIN') && perfil.usuario.idPersonal === idMedico;

  useEffect(() => {
    miPerfilProfesional().then((p) => setEspecialidad(p?.especialidades[0]?.nombre ?? null)).catch(() => undefined);
  }, []);
  useEffect(() => {
    if (perfil) listarMedicos(perfil).then(setMedicos).catch((e: Error) => setError(e.message));
  }, [perfil]);

  const cargar = useCallback(() => {
    const reloj = ahoraLocal();
    setAhora(reloj);
    buscarPacientes({ estado: 'ACTIVO', porPagina: 1 }).then((r) => setActivos(r.total)).catch(() => undefined);
    if (!idMedico) return;
    agenda({ idMedico, desde: reloj.fecha })
      .then((r) => { setCitas(r.citas); setError(null); })
      .catch((e: Error) => setError(e.message));
  }, [idMedico]);

  useEffect(() => {
    setCitas(null);
    cargar();
    const cada = setInterval(cargar, REFRESCO_AGENDA_MS);
    const alVolver = () => { if (document.visibilityState === 'visible') cargar(); };
    document.addEventListener('visibilitychange', alVolver);
    return () => { clearInterval(cada); document.removeEventListener('visibilitychange', alVolver); };
  }, [cargar]);

  const acciones = useAccionesCita(cargar);

  const delDia = useMemo(
    () => (citas ?? []).filter((c) => c.fecha === ahora.fecha && c.estado !== 'CANCELADA').sort((a, b) => a.hora.localeCompare(b.hora)),
    [citas, ahora.fecha],
  );
  const activas = delDia.filter((c) => ESTADOS_ACTIVOS.includes(c.estado));
  const proximas = activas.filter((c) => c.estado !== 'EN_CONSULTA' && c.hora >= ahora.hora).slice(0, PROXIMAS_VISIBLES);
  const enConsulta = delDia.filter((c) => c.estado === 'EN_CONSULTA').length;
  const atendidas = delDia.filter((c) => c.estado === 'ATENDIDA').length;
  const cerradas = atendidas + delDia.filter((c) => c.estado === 'NO_ASISTIO').length;
  const avance = delDia.length ? Math.round((cerradas / delDia.length) * 100) : 0;

  const hoy = fechaLarga.format(new Date());
  const subtitulo = [hoy.charAt(0).toUpperCase() + hoy.slice(1).replace(',', ''), especialidad, perfil?.institucion.nombre].filter(Boolean).join(' · ');
  const medico = medicos?.find((m) => m.id === idMedico);
  const cargando = !citas && !error;
  const subtituloAgenda = !citas ? 'Cargando…'
    : `${cerradas} de ${delDia.length} citas cerradas${proximas[0] ? ` · próxima a las ${proximas[0].hora}` : ''}`;

  return (
    <div className="view">
      <header className="ph">
        <div className="ph__row">
          <div className="ph__text">
            <h1 className="h1">{saludo()}, {perfil ? tratamiento(perfil.usuario.nombre) : ''}</h1>
            <p>{subtitulo}</p>
          </div>
          <div className="ph__actions">
            <Link className="rc-btn rc-btn--secondary" href="/pacientes">
              <Search strokeWidth={1.75} aria-hidden="true" />
              Buscar paciente
            </Link>
            <Link className="rc-btn rc-btn--primary" href="/nueva-cita">
              <Plus strokeWidth={1.75} aria-hidden="true" />
              Nueva cita
            </Link>
          </div>
        </div>
      </header>
      <div className="stats">
        <div className="rc-stat">
          <span className="rc-stat__label"><span className="rc-stat__icon"><CalendarDays strokeWidth={1.75} aria-hidden="true" /></span>Citas de hoy</span>
          {citas ? <span className="rc-stat__value">{delDia.length}</span> : <span className="rc-skeleton" style={{ display: 'block', height: '32px', width: '80px' }} />}
        </div>
        <div className="rc-stat">
          <span className="rc-stat__label"><span className="rc-stat__icon"><Users strokeWidth={1.75} aria-hidden="true" /></span>Pacientes activos</span>
          {activos === null
            ? <span className="rc-skeleton" style={{ display: 'block', height: '32px', width: '80px' }} />
            : <span className="rc-stat__value">{formatoNumero(activos)}</span>}
        </div>
        <div className="rc-stat">
          <span className="rc-stat__label"><span className="rc-stat__icon"><Stethoscope strokeWidth={1.75} aria-hidden="true" /></span>En consulta</span>
          {citas ? <span className="rc-stat__value">{enConsulta}<small>{enConsulta === 1 ? 'paciente' : 'pacientes'}</small></span> : <span className="rc-skeleton" style={{ display: 'block', height: '32px', width: '80px' }} />}
        </div>
        <div className="rc-stat">
          <span className="rc-stat__label"><span className="rc-stat__icon"><CircleCheck strokeWidth={1.75} aria-hidden="true" /></span>Avance del día</span>
          {citas ? <span className="rc-stat__value">{avance}<small>%</small></span> : <span className="rc-skeleton" style={{ display: 'block', height: '32px', width: '80px' }} />}
          <div className="rc-meter" role="meter" aria-valuenow={avance} aria-valuemin={0} aria-valuemax={100} aria-label="Avance del día"><span style={{ width: `${avance}%` }} /></div>
        </div>
      </div>
      {(error || acciones.error) && (
        <div className="rc-alert rc-alert--danger" role="alert">
          <X strokeWidth={1.75} aria-hidden="true" />
          <div className="rc-alert__body"><span className="rc-alert__title">No pudimos actualizar la agenda</span><span className="rc-alert__text">{error ?? acciones.error}</span></div>
        </div>
      )}
      <div className="split">
        <section className="rc-card" style={{ padding: 0, gap: 0 }} aria-busy={cargando}>
          <div className="card-h">
            <div>
              <h2 className="rc-card__title">Agenda de hoy{medico && !esMedico ? ` · ${nombreProfesional(medico)}` : ''}</h2>
              <p className="rc-card__sub">{subtituloAgenda}</p>
            </div>
            {!perfil?.usuario.idPersonal && medicos && medicos.length > 1 && (
              <Selector pequeno aria-label="Médico" value={idMedico ?? ''} onChange={setMedicoElegido}>
                {medicos.map((m) => <option key={m.id} value={m.id}>{nombreProfesional(m)}</option>)}
              </Selector>
            )}
            <Link className="rc-link" href="/citas">Ver agenda</Link>
          </div>
          <div className="rc-table-wrap flat">
            <table className="rc-table">
              <thead>
                <tr>
                  <th>Hora</th>
                  <th>Paciente</th>
                  <th className="hide-sm">Motivo</th>
                  <th>Estado</th>
                  <th className="rc-cell-actions"><span className="rc-sr">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {cargando && Array.from({ length: 4 }, (_, i) => (
                  <tr key={i}><td colSpan={5}><span className="rc-skeleton" style={{ display: 'block', height: '20px' }} /></td></tr>
                ))}
                {delDia.map((c) => (
                  <tr key={c.id}>
                    <td className="rc-num">{c.hora}</td>
                    <td>
                      <Link className="rowlink" href={`/pacientes/${c.idPaciente}`}>
                        <div className="rc-person">
                          <span className={`rc-avatar ${varianteAvatar(c.idPaciente)}`}>{iniciales(c.paciente.nombres, c.paciente.apellidos)}</span>
                          <div className="rc-person__text">
                            <span className="rc-person__name">{c.paciente.nombres} {c.paciente.apellidos}</span>
                            <span className="rc-person__meta">CUI {formatoCui(c.paciente.cui)}</span>
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td className="hide-sm">{c.motivo ?? 'Sin motivo'}</td>
                    <td><PillCita estado={c.estado} /></td>
                    <td className="rc-cell-actions">{acciones.menu(c, esMedico)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {citas && delDia.length === 0 && (
              <div className="rc-empty">
                <span className="rc-empty__icon"><CalendarX strokeWidth={1.75} aria-hidden="true" /></span>
                <span className="rc-empty__title">Sin citas para hoy</span>
                <span className="rc-empty__text">Cuando se agende una cita para hoy aparecerá aquí.</span>
              </div>
            )}
          </div>
        </section>
        <aside className="col">
          <div className="rc-card">
            <div className="rc-card__header">
              <h2 className="rc-card__title">Próximas citas</h2>
              <span className="rc-badge rc-badge--soft">{proximas.length}</span>
            </div>
            <div className="list">
              {proximas.map((c) => (
                <Link key={c.id} className="rowlink" href={`/pacientes/${c.idPaciente}`}>
                  <div className="rc-person">
                    <span className={`rc-avatar ${varianteAvatar(c.idPaciente)}`}>{iniciales(c.paciente.nombres, c.paciente.apellidos)}</span>
                    <div className="rc-person__text">
                      <span className="rc-person__name">{c.paciente.nombres} {c.paciente.apellidos}</span>
                      <span className="rc-person__meta"><Clock strokeWidth={1.75} aria-hidden="true" style={{ width: 12, height: 12 }} /> {c.hora} · {c.motivo ?? 'Sin motivo'}</span>
                    </div>
                  </div>
                </Link>
              ))}
              {citas && proximas.length === 0 && <span className="muted small">No quedan citas pendientes por atender hoy.</span>}
            </div>
          </div>
        </aside>
      </div>
      {acciones.dialogo}
    </div>
  );
}
