'use client';
// Borrador generado desde prototipo.html (vista "inicio") por scripts/prototipo-a-jsx.py.
// Conectados: saludo (sesión + módulo personal) y "Pacientes activos" (módulo pacientes).
// La agenda, sala de espera y pendientes siguen con datos del prototipo.
import { useEffect, useState } from 'react';
import { useSesion } from '../lib/sesion';
import { miPerfilProfesional } from '../api/personal';
import { buscarPacientes } from '../api/pacientes';
import { formatoNumero } from '../datos/formato';
import { Bed, CalendarDays, Check, CircleCheck, Clock, FlaskConical, MoreVertical, Plus, Search, TrendingUp, Users } from 'lucide-react';
import Link from 'next/link';

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

  useEffect(() => {
    miPerfilProfesional().then((p) => setEspecialidad(p?.especialidades[0]?.nombre ?? null)).catch(() => undefined);
    buscarPacientes({ estado: 'ACTIVO', porPagina: 1 }).then((r) => setActivos(r.total)).catch(() => undefined);
  }, []);

  const hoy = fechaLarga.format(new Date());
  const subtitulo = [hoy.charAt(0).toUpperCase() + hoy.slice(1).replace(',', ''), especialidad, perfil?.institucion.nombre].filter(Boolean).join(' · ');

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
          <span className="rc-stat__label">
            <span className="rc-stat__icon">
              <CalendarDays strokeWidth={1.75} aria-hidden="true" />
            </span>
            Citas de hoy
          </span>
          <span className="rc-stat__value">14</span>
          <span className="rc-delta rc-delta--up">
            <TrendingUp strokeWidth={1.75} aria-hidden="true" />
            +2
            <span className="rc-delta__ctx">vs. jueves pasado</span>
          </span>
        </div>
        <div className="rc-stat">
          <span className="rc-stat__label">
            <span className="rc-stat__icon">
              <Users strokeWidth={1.75} aria-hidden="true" />
            </span>
            Pacientes activos
          </span>
          {activos === null
            ? <span className="rc-skeleton" style={{ display: 'block', height: '32px', width: '80px' }} />
            : <span className="rc-stat__value">{formatoNumero(activos)}</span>}
        </div>
        <div className="rc-stat">
          <span className="rc-stat__label">
            <span className="rc-stat__icon">
              <Clock strokeWidth={1.75} aria-hidden="true" />
            </span>
            En sala de espera
          </span>
          <span className="rc-stat__value">3<small>pacientes</small></span>
        </div>
        <div className="rc-stat">
          <span className="rc-stat__label">
            <span className="rc-stat__icon">
              <Bed strokeWidth={1.75} aria-hidden="true" />
            </span>
            Ocupación de camas
          </span>
          <span className="rc-stat__value">78<small>%</small></span>
          <div className="rc-meter" role="meter" aria-valuenow={78} aria-valuemin={0} aria-valuemax={100} aria-label="Ocupación de camas"><span style={{ width: '78%' }} /></div>
        </div>
      </div>
      <div className="split">
        <section className="rc-card" style={{ padding: 0, gap: 0 }}>
          <div className="card-h">
            <div>
              <h2 className="rc-card__title">Agenda de hoy</h2>
              <p className="rc-card__sub">6 de 14 citas · próxima a las 09:00</p>
            </div>
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
                <tr>
                  <td className="rc-num">08:00</td>
                  <td>
                    <div className="rc-person">
                      <span className="rc-avatar ">ML</span>
                      <div className="rc-person__text">
                        <span className="rc-person__name">María José López Ramírez</span>
                        <span className="rc-person__meta">CUI 2547 88120 0101</span>
                      </div>
                    </div>
                  </td>
                  <td className="hide-sm">Control de hipertensión</td>
                  <td>
                    <span className="rc-pill rc-pill--success">
                      <Check strokeWidth={1.75} aria-hidden="true" />
                      Atendida
                    </span>
                  </td>
                  <td className="rc-cell-actions">
                    <button className="rc-btn rc-btn--ghost rc-btn--neutral rc-btn--icon rc-btn--sm" aria-label="Acciones">
                      <MoreVertical strokeWidth={1.75} aria-hidden="true" />
                    </button>
                  </td>
                </tr>
                <tr>
                  <td className="rc-num">08:30</td>
                  <td>
                    <div className="rc-person">
                      <span className="rc-avatar rc-avatar--neutral">CA</span>
                      <div className="rc-person__text">
                        <span className="rc-person__name">Carlos Ajú Tzul</span>
                        <span className="rc-person__meta">CUI 1987 66301 0901</span>
                      </div>
                    </div>
                  </td>
                  <td className="hide-sm">Dolor torácico</td>
                  <td>
                    <span className="rc-pill rc-pill--accent rc-pill--live"><span className="rc-pill__dot" />En consulta</span>
                  </td>
                  <td className="rc-cell-actions">
                    <button className="rc-btn rc-btn--ghost rc-btn--neutral rc-btn--icon rc-btn--sm" aria-label="Acciones">
                      <MoreVertical strokeWidth={1.75} aria-hidden="true" />
                    </button>
                  </td>
                </tr>
                <tr>
                  <td className="rc-num">09:00</td>
                  <td>
                    <div className="rc-person">
                      <span className="rc-avatar ">SH</span>
                      <div className="rc-person__text">
                        <span className="rc-person__name">Sofía Hernández Pérez</span>
                        <span className="rc-person__meta">CUI 2210 77450 0101</span>
                      </div>
                    </div>
                  </td>
                  <td className="hide-sm">Resultados de laboratorio</td>
                  <td>
                    <span className="rc-pill rc-pill--info">
                      <CircleCheck strokeWidth={1.75} aria-hidden="true" />
                      Confirmada
                    </span>
                  </td>
                  <td className="rc-cell-actions">
                    <button className="rc-btn rc-btn--ghost rc-btn--neutral rc-btn--icon rc-btn--sm" aria-label="Acciones">
                      <MoreVertical strokeWidth={1.75} aria-hidden="true" />
                    </button>
                  </td>
                </tr>
                <tr>
                  <td className="rc-num">09:30</td>
                  <td>
                    <div className="rc-person">
                      <span className="rc-avatar rc-avatar--accent">LM</span>
                      <div className="rc-person__text">
                        <span className="rc-person__name">Luis Mazariegos</span>
                        <span className="rc-person__meta">CUI 2899 10023 0101</span>
                      </div>
                    </div>
                  </td>
                  <td className="hide-sm">Primera consulta</td>
                  <td>
                    <span className="rc-pill rc-pill--info">
                      <CircleCheck strokeWidth={1.75} aria-hidden="true" />
                      Confirmada
                    </span>
                  </td>
                  <td className="rc-cell-actions">
                    <button className="rc-btn rc-btn--ghost rc-btn--neutral rc-btn--icon rc-btn--sm" aria-label="Acciones">
                      <MoreVertical strokeWidth={1.75} aria-hidden="true" />
                    </button>
                  </td>
                </tr>
                <tr>
                  <td className="rc-num">10:00</td>
                  <td>
                    <div className="rc-person">
                      <span className="rc-avatar rc-avatar--neutral">RG</span>
                      <div className="rc-person__text">
                        <span className="rc-person__name">Rosa Gómez de León</span>
                        <span className="rc-person__meta">CUI 1755 44120 0108</span>
                      </div>
                    </div>
                  </td>
                  <td className="hide-sm">Seguimiento postoperatorio</td>
                  <td>
                    <span className="rc-pill "><span className="rc-pill__dot" />Programada</span>
                  </td>
                  <td className="rc-cell-actions">
                    <button className="rc-btn rc-btn--ghost rc-btn--neutral rc-btn--icon rc-btn--sm" aria-label="Acciones">
                      <MoreVertical strokeWidth={1.75} aria-hidden="true" />
                    </button>
                  </td>
                </tr>
                <tr>
                  <td className="rc-num">10:30</td>
                  <td>
                    <div className="rc-person">
                      <span className="rc-avatar ">JT</span>
                      <div className="rc-person__text">
                        <span className="rc-person__name">José Tum Chávez</span>
                        <span className="rc-person__meta">CUI 3120 87702 1401</span>
                      </div>
                    </div>
                  </td>
                  <td className="hide-sm">Control de diabetes</td>
                  <td>
                    <span className="rc-pill rc-pill--warning">
                      <Clock strokeWidth={1.75} aria-hidden="true" />
                      No asistió
                    </span>
                  </td>
                  <td className="rc-cell-actions">
                    <button className="rc-btn rc-btn--ghost rc-btn--neutral rc-btn--icon rc-btn--sm" aria-label="Acciones">
                      <MoreVertical strokeWidth={1.75} aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
        <aside className="col">
          <div className="rc-alert rc-alert--danger" role="alert">
            <FlaskConical strokeWidth={1.75} aria-hidden="true" />
            <div className="rc-alert__body">
              <span className="rc-alert__title">Valor crítico de laboratorio</span>
              <span className="rc-alert__text">Potasio 6.4 mmol/L en Sofía Hernández. Validado hace 12 min.</span>
              <div className="rc-alert__actions">
                <Link className="rc-btn rc-btn--secondary rc-btn--sm" href="/laboratorio">Ver resultado</Link>
              </div>
            </div>
          </div>
          <div className="rc-card">
            <div className="rc-card__header">
              <h2 className="rc-card__title">En sala de espera</h2>
              <span className="rc-badge rc-badge--soft">3</span>
            </div>
            <div className="list">
              <div className="rc-person">
                <span className="rc-avatar ">SH</span>
                <div className="rc-person__text">
                  <span className="rc-person__name">Sofía Hernández Pérez</span>
                  <span className="rc-person__meta">Llegó 08:41 · cita 09:00</span>
                </div>
              </div>
              <div className="rc-person">
                <span className="rc-avatar rc-avatar--accent">LM</span>
                <div className="rc-person__text">
                  <span className="rc-person__name">Luis Mazariegos</span>
                  <span className="rc-person__meta">Llegó 08:52 · cita 09:30</span>
                </div>
              </div>
              <div className="rc-person">
                <span className="rc-avatar rc-avatar--neutral">RG</span>
                <div className="rc-person__text">
                  <span className="rc-person__name">Rosa Gómez de León</span>
                  <span className="rc-person__meta">Llegó 08:58 · cita 10:00</span>
                </div>
              </div>
            </div>
          </div>
          <div className="rc-card">
            <h2 className="rc-card__title">Pendientes</h2>
            <div className="list">
              <label className="rc-check">
                <input type="checkbox" />
                <span className="rc-check__text">Firmar 2 recetas<span className="rc-check__hint">Emitidas ayer por residente</span></span>
              </label>
              <label className="rc-check">
                <input type="checkbox" />
                <span className="rc-check__text">
                  Revisar hematología de Carlos Ajú
                  <span className="rc-check__hint">Validada 04/11/2026</span>
                </span>
              </label>
              <label className="rc-check">
                <input type="checkbox" defaultChecked />
                <span className="rc-check__text">Notas de evolución del miércoles</span>
              </label>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
