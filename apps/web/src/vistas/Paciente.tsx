'use client';
// Vista "paciente" del prototipo. Encabezado, alergias, antecedentes y accesos conectados a la API
// (GET /pacientes/:id, POST /pacientes/:id/alergias|antecedentes, GET /auditoria/pacientes/:id/accesos).
// Las pestañas, signos vitales, consultas y tratamiento siguen con datos del prototipo hasta que
// los conecten los módulos atencion y prescripcion.
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Activity, CalendarDays, ChevronRight, ClipboardList, Droplet, Eye, FlaskConical, HeartPulse, History,
  Loader2, Pill, Plus, ShieldAlert, Stethoscope, Thermometer, TriangleAlert, Users, Weight, Wind,
} from 'lucide-react';
import type { AccesoPaciente, Alergia, PacienteFicha, Severidad } from '@red-clinica/shared';
import { obtenerPaciente } from '../api/pacientes';
import { registrarAlergia, registrarAntecedente } from '../api/antecedentes';
import { accesosAPaciente } from '../api/auditoria';
import { useSesion } from '../lib/sesion';
import { useToast } from '../layout/Toasts';
import { ModalCuadroClinico, type Registro } from '../componentes/ModalCuadroClinico';
import {
  NOMBRE_ROL, edad, formatoCui, formatoFecha, formatoFechaHora, formatoSangre, formatoTelefono, iniciales, inicialesDeNombre, varianteAvatar,
} from '../datos/formato';

const SEXO: Record<string, string> = { F: 'Femenino', M: 'Masculino' };
const SEVERIDAD: Record<Severidad, string> = { LEVE: 'leve', MODERADA: 'moderada', SEVERA: 'severa' };
const TAG_SEVERIDAD: Record<Severidad, string> = { LEVE: 'rc-tag--info', MODERADA: 'rc-tag--warning', SEVERA: 'rc-tag--danger' };

function TagAlergia({ a }: { a: Alergia }) {
  const sev = a.severidad ?? 'LEVE';
  return (
    <span className={`rc-tag ${TAG_SEVERIDAD[sev]}`} title={a.descripcion ?? undefined}>
      {sev === 'SEVERA' && <ShieldAlert strokeWidth={1.75} aria-hidden="true" />}
      {a.tipo}{a.severidad ? ` · ${SEVERIDAD[a.severidad]}` : ''}
    </span>
  );
}

/** Alerta roja del prototipo: una por paciente, con todas las alergias severas. */
function AlertaAlergias({ alergias }: { alergias: Alergia[] }) {
  const severas = alergias.filter((a) => a.severidad === 'SEVERA');
  if (!severas.length) return null;
  const titulo = severas.length === 1
    ? `Alergia severa a ${severas[0]!.tipo.toLowerCase()}`
    : `Alergias severas: ${severas.map((a) => a.tipo.toLowerCase()).join(', ')}`;
  const texto = severas.map((a) => a.descripcion).filter(Boolean).join(' ');
  return (
    <div className="rc-alert rc-alert--danger" role="alert">
      <ShieldAlert strokeWidth={1.75} aria-hidden="true" />
      <div className="rc-alert__body">
        <span className="rc-alert__title">{titulo}</span>
        <span className="rc-alert__text">{texto || 'Verifique antes de recetar o aplicar medicamentos.'}</span>
      </div>
    </div>
  );
}

/** Quién vio o modificó el expediente (bitácora). Solo para médicos y auditoría. */
function Accesos({ idPaciente, version }: { idPaciente: string; version: number }) {
  const [accesos, setAccesos] = useState<AccesoPaciente[] | null>(null);
  useEffect(() => { accesosAPaciente(idPaciente).then(setAccesos).catch(() => setAccesos([])); }, [idPaciente, version]);
  return (
    <section className="rc-card">
      <div className="rc-card__header">
        <div>
          <h2 className="rc-card__title">Accesos al expediente</h2>
          <p className="rc-card__sub">Cada lectura queda en la bitácora.</p>
        </div>
        <Eye strokeWidth={1.75} aria-hidden="true" className="muted" />
      </div>
      {!accesos && <span className="rc-skeleton" style={{ display: 'block', height: '40px' }} />}
      {accesos?.length === 0 && <span className="muted small">Sin accesos registrados.</span>}
      <div className="list">
        {accesos?.slice(0, 5).map((a) => (
          <div className="rc-person" key={a.usuario.id}>
            <span className={`rc-avatar rc-avatar--sm ${varianteAvatar(a.usuario.id)}`}>{inicialesDeNombre(a.usuario.nombre)}</span>
            <div className="rc-person__text">
              <span className="rc-person__name">{a.usuario.nombre}</span>
              <span className="rc-person__meta">
                {NOMBRE_ROL[a.usuario.rol]} · {formatoFechaHora(a.ultimoAcceso)}
                {a.modificaciones > 0 ? ` · ${a.modificaciones} ${a.modificaciones === 1 ? 'cambio' : 'cambios'}` : ''}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function Paciente({ id }: { id: string }) {
  const { perfil } = useSesion();
  const toast = useToast();
  const [p, setP] = useState<PacienteFicha | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<Registro | null>(null);
  const [version, setVersion] = useState(0);

  const cargar = useCallback(() => {
    obtenerPaciente(id).then(setP).catch((e: Error) => setError(e.message));
  }, [id]);
  useEffect(cargar, [cargar]);

  if (error) {
    return (
      <div className="view">
        <div className="rc-alert rc-alert--danger" role="alert">
          <div className="rc-alert__body"><span className="rc-alert__title">No pudimos abrir el expediente</span><span className="rc-alert__text">{error}</span></div>
        </div>
        <Link className="rc-btn rc-btn--secondary" href="/pacientes" style={{ alignSelf: 'flex-start' }}>Volver a pacientes</Link>
      </div>
    );
  }
  if (!p) return <div className="view"><span className="rc-spinner rc-spinner--lg" aria-label="Cargando expediente" /></div>;

  const nombre = `${p.nombres} ${p.apellidos}`;
  const activo = p.estado === 'ACTIVO';
  const rol = perfil?.usuario.rol;
  const puedeEscribir = activo && rol !== undefined && ['MEDICO', 'ENFERMERIA', 'RECEPCION', 'ADMIN'].includes(rol);
  const veAccesos = rol !== undefined && ['MEDICO', 'AUDITOR', 'ADMIN'].includes(rol);
  const datos = [formatoCui(p.cui) !== '—' ? `CUI ${formatoCui(p.cui)}` : null, `${edad(p.fechaNacimiento)} años`, p.sexo ? SEXO[p.sexo] ?? p.sexo : null, p.tipoSangre ? formatoSangre(p.tipoSangre) : null]
    .filter(Boolean).join(' · ');

  return (
    <div className="view">
      <header className="ph">
        <ol className="rc-breadcrumbs" aria-label="Ruta">
          <li>
            <Link href="/pacientes">Pacientes</Link>
            <ChevronRight strokeWidth={1.75} aria-hidden="true" />
          </li>
          <li><span aria-current="page">{nombre}</span></li>
        </ol>
        <div className="ph__row">
          <div className="ph__text">
            <h1 className="h1">{nombre}</h1>
            <p>{datos}</p>
          </div>
          {activo && (
            <div className="ph__actions">
              <Link className="rc-btn rc-btn--secondary" href={`/nueva-cita?paciente=${p.id}`}>
                <CalendarDays strokeWidth={1.75} aria-hidden="true" />
                Agendar cita
              </Link>
              <Link className="rc-btn rc-btn--primary" href={`/consulta?paciente=${p.id}`}>
                <Stethoscope strokeWidth={1.75} aria-hidden="true" />
                Iniciar consulta
              </Link>
            </div>
          )}
        </div>
      </header>
      {p.baja && (
        <div className="rc-alert rc-alert--warning" role="status">
          <TriangleAlert strokeWidth={1.75} aria-hidden="true" />
          <div className="rc-alert__body">
            <span className="rc-alert__title">Paciente de baja desde el {formatoFecha(p.baja.fecha)}</span>
            <span className="rc-alert__text">{p.baja.motivo}. El expediente es de solo lectura.</span>
          </div>
        </div>
      )}
      <AlertaAlergias alergias={p.alergias} />
      <div className="rc-tabs" role="tablist">
        <button className="rc-tab" role="tab" aria-selected="true">
          <ClipboardList strokeWidth={1.75} aria-hidden="true" />
          Resumen
        </button>
        <button className="rc-tab" role="tab">
          <Stethoscope strokeWidth={1.75} aria-hidden="true" />
          Consultas
          <span className="rc-badge rc-badge--soft">12</span>
        </button>
        <button className="rc-tab" role="tab">
          <CalendarDays strokeWidth={1.75} aria-hidden="true" />
          Citas
          <span className="rc-badge rc-badge--soft">1</span>
        </button>
        <button className="rc-tab" role="tab">
          <Pill strokeWidth={1.75} aria-hidden="true" />
          Recetas
        </button>
        <button className="rc-tab" role="tab">
          <FlaskConical strokeWidth={1.75} aria-hidden="true" />
          Laboratorio
          <span className="rc-badge">1</span>
        </button>
        <button className="rc-tab" role="tab">
          <Users strokeWidth={1.75} aria-hidden="true" />
          Perfil social
        </button>
      </div>
      <div className="split">
        <div className="col">
          <section className="rc-card">
            <div className="rc-card__header">
              <div>
                <h2 className="rc-card__title">Signos vitales</h2>
                <p className="rc-card__sub">Última toma: 04/11/2026 · 08:12 · Enf. Marta Cifuentes</p>
              </div>
              <button className="rc-btn rc-btn--ghost rc-btn--sm">
                <History strokeWidth={1.75} aria-hidden="true" />
                Historial
              </button>
            </div>
            <div className="vitals">
              <div className="vital">
                <span className="vital__l">
                  <HeartPulse strokeWidth={1.75} aria-hidden="true" />
                  Presión arterial
                </span>
                <span className="vital__v rc-num">132/84<small>mmHg</small></span>
                <span className="rc-pill rc-pill--warning">
                  <TriangleAlert strokeWidth={1.75} aria-hidden="true" />
                  Elevada
                </span>
              </div>
              <div className="vital">
                <span className="vital__l">
                  <Activity strokeWidth={1.75} aria-hidden="true" />
                  Frec. cardiaca
                </span>
                <span className="vital__v rc-num">78<small>lpm</small></span>
              </div>
              <div className="vital">
                <span className="vital__l">
                  <Thermometer strokeWidth={1.75} aria-hidden="true" />
                  Temperatura
                </span>
                <span className="vital__v rc-num">36.7<small>°C</small></span>
              </div>
              <div className="vital">
                <span className="vital__l">
                  <Droplet strokeWidth={1.75} aria-hidden="true" />
                  Saturación O₂
                </span>
                <span className="vital__v rc-num">97<small>%</small></span>
              </div>
              <div className="vital">
                <span className="vital__l">
                  <Wind strokeWidth={1.75} aria-hidden="true" />
                  Frec. respiratoria
                </span>
                <span className="vital__v rc-num">16<small>rpm</small></span>
              </div>
              <div className="vital">
                <span className="vital__l">
                  <Weight strokeWidth={1.75} aria-hidden="true" />
                  Peso · talla
                </span>
                <span className="vital__v rc-num">61.4 · 158<small>kg · cm</small></span>
                <span className="vital__n">IMC 24.6</span>
              </div>
            </div>
          </section>
          <section className="rc-card" style={{ padding: 0, gap: 0 }}>
            <div className="card-h">
              <h2 className="rc-card__title">Consultas recientes</h2>
              <Link className="rc-link" href="/paciente">Ver las 12</Link>
            </div>
            <div className="rc-table-wrap flat">
              <table className="rc-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Motivo</th>
                    <th className="hide-sm">Diagnóstico</th>
                    <th className="hide-sm">Médico</th>
                    <th className="rc-cell-actions"><span className="rc-sr">Abrir</span></th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="rc-num">04/11/2026</td>
                    <td>Control de hipertensión</td>
                    <td className="hide-sm">Hipertensión arterial esencial (I10)</td>
                    <td className="hide-sm">Dra. Ana Lucía Pérez</td>
                    <td className="rc-cell-actions">
                      <button className="rc-btn rc-btn--ghost rc-btn--neutral rc-btn--icon rc-btn--sm" aria-label="Abrir consulta">
                        <ChevronRight strokeWidth={1.75} aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                  <tr>
                    <td className="rc-num">12/08/2026</td>
                    <td>Cefalea frecuente</td>
                    <td className="hide-sm">Cefalea tensional (G44.2)</td>
                    <td className="hide-sm">Dr. Carlos Méndez</td>
                    <td className="rc-cell-actions">
                      <button className="rc-btn rc-btn--ghost rc-btn--neutral rc-btn--icon rc-btn--sm" aria-label="Abrir consulta">
                        <ChevronRight strokeWidth={1.75} aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                  <tr>
                    <td className="rc-num">03/05/2026</td>
                    <td>Chequeo general</td>
                    <td className="hide-sm">Sin hallazgos</td>
                    <td className="hide-sm">Dra. Ana Lucía Pérez</td>
                    <td className="rc-cell-actions">
                      <button className="rc-btn rc-btn--ghost rc-btn--neutral rc-btn--icon rc-btn--sm" aria-label="Abrir consulta">
                        <ChevronRight strokeWidth={1.75} aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
          <section className="rc-card">
            <div className="rc-card__header">
              <h2 className="rc-card__title">Tratamiento activo</h2>
              <span className="rc-pill rc-pill--info">
                <Loader2 strokeWidth={1.75} aria-hidden="true" />
                En curso
              </span>
            </div>
            <div className="rx">
              <span className="rx__icon">
                <Pill strokeWidth={1.75} aria-hidden="true" />
              </span>
              <div>
                <b>Losartán 50 mg</b>
                · tableta · oral
                <div className="muted">1 tableta cada 24 horas · 90 días · desde 04/11/2026</div>
              </div>
              <span className="rc-tag rc-num">90 u</span>
            </div>
            <div className="rx">
              <span className="rx__icon">
                <Pill strokeWidth={1.75} aria-hidden="true" />
              </span>
              <div>
                <b>Hidroclorotiazida 12.5 mg</b>
                · tableta · oral
                <div className="muted">1 tableta cada 24 horas por la mañana · 90 días</div>
              </div>
              <span className="rc-tag rc-num">90 u</span>
            </div>
          </section>
        </div>
        <aside className="col">
          <section className="rc-card">
            <div className="rc-card__header">
              <div className="rc-person">
                <span className={`rc-avatar rc-avatar--lg ${varianteAvatar(p.id)}`}>{iniciales(p.nombres, p.apellidos)}</span>
                <div className="rc-person__text">
                  <span className="rc-person__name">{p.nombres.split(' ')[0]} {p.apellidos.split(' ')[0]}</span>
                  <span className="rc-person__meta">{perfil?.institucion.nombre}</span>
                </div>
              </div>
              {activo
                ? <span className="rc-pill rc-pill--success"><span className="rc-pill__dot" />Activo</span>
                : <span className="rc-pill"><span className="rc-pill__dot" />De baja</span>}
            </div>
            <dl className="rc-dl">
              <div>
                <dt>Nacimiento</dt>
                <dd>{formatoFecha(p.fechaNacimiento)}</dd>
              </div>
              <div>
                <dt>Procedencia</dt>
                <dd>{p.procedencia ?? '—'}</dd>
              </div>
              <div>
                <dt>Teléfono</dt>
                <dd>{formatoTelefono(p.telefonos[0] ?? p.telefono)}</dd>
              </div>
              <div>
                <dt>Correo</dt>
                <dd className="ellip">{p.emails[0] ?? '—'}</dd>
              </div>
            </dl>
            {p.direccion && (
              <div className="rc-field">
                <span className="rc-overline">Dirección</span>
                <span>{p.direccion}</span>
              </div>
            )}
          </section>
          <section className="rc-card">
            <div className="rc-card__header">
              <h2 className="rc-card__title">Alergias y antecedentes</h2>
              {puedeEscribir && (
                <button className="rc-btn rc-btn--soft rc-btn--sm" onClick={() => setModal('alergia')}>
                  <Plus strokeWidth={1.75} aria-hidden="true" />
                  Agregar
                </button>
              )}
            </div>
            {p.alergias.length > 0
              ? <div className="tags">{p.alergias.map((a) => <TagAlergia key={a.id} a={a} />)}</div>
              : <span className="muted small">Sin alergias conocidas.</span>}
            {p.antecedentes.length > 0
              ? <div className="tags">{p.antecedentes.map((a) => <span key={a.id} className="rc-tag" title={a.descripcion ?? undefined}>{a.tipo}</span>)}</div>
              : <span className="muted small">Sin antecedentes registrados.</span>}
          </section>
          {veAccesos && <Accesos idPaciente={p.id} version={version} />}
        </aside>
      </div>
      {modal && (
        <ModalCuadroClinico inicial={modal} onCerrar={() => setModal(null)}
          enviar={(r) => (r.tipo === 'alergia' ? registrarAlergia(p.id, r.datos) : registrarAntecedente(p.id, r.datos)).then(() => undefined)}
          onGuardado={(tipo, n) => {
            setModal(null);
            toast(tipo === 'alergia' ? 'Alergia registrada' : 'Antecedente registrado', `${n} quedó en el expediente de ${nombre}.`);
            cargar();
            setVersion((v) => v + 1);
          }} />
      )}
    </div>
  );
}
