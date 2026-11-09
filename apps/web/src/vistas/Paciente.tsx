'use client';
// Vista "paciente" del prototipo. Encabezado, alergias, antecedentes y accesos conectados a la API
// (GET /pacientes/:id, POST /pacientes/:id/alergias|antecedentes, GET /auditoria/pacientes/:id/accesos).
// Las pestañas, signos vitales, consultas y tratamiento siguen con datos del prototipo hasta que
// los conecten los módulos atencion y prescripcion.
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CalendarDays, ChevronRight, ClipboardList, Eye, FlaskConical, Pill, Plus, ShieldAlert, Stethoscope, TriangleAlert, Users,
} from 'lucide-react';
import type { AccesoPaciente, Alergia, PacienteFicha, Severidad } from '@red-clinica/shared';
import { obtenerPaciente } from '../api/pacientes';
import { registrarAlergia, registrarAntecedente } from '../api/antecedentes';
import { accesosAPaciente } from '../api/auditoria';
import { useSesion } from '../lib/sesion';
import { useToast } from '../layout/Toasts';
import { ModalCuadroClinico, type Registro } from '../componentes/ModalCuadroClinico';
import { ListaRecetas, PanelCitas, PanelLaboratorio, PerfilSocial, TablaConsultas, useExpediente, type Expediente, type Visibilidad } from './paciente/expediente';
import {
  NOMBRE_ROL, edad, formatoCui, formatoFecha, formatoFechaHora, formatoSangre, formatoTelefono, iniciales, inicialesDeNombre, varianteAvatar,
} from '../datos/formato';

const SEXO: Record<string, string> = { F: 'Femenino', M: 'Masculino' };
const SEVERIDAD: Record<Severidad, string> = { LEVE: 'leve', MODERADA: 'moderada', SEVERA: 'severa' };
const TAG_SEVERIDAD: Record<Severidad, string> = { LEVE: 'rc-tag--info', MODERADA: 'rc-tag--warning', SEVERA: 'rc-tag--danger' };

type Pestana = 'resumen' | 'consultas' | 'citas' | 'recetas' | 'laboratorio' | 'social';

// Roles por sección; igual que la API (ADMIN siempre pasa en `exigirRol`).
const ROLES_CONSULTAS = ['MEDICO', 'ENFERMERIA', 'ADMIN'];
/** Recepción ve recetas y resultados de laboratorio para informarlos al paciente. */
const ROLES_RECETAS_LAB = ['MEDICO', 'ENFERMERIA', 'RECEPCION', 'ADMIN'];
const ROLES_CITAS = ['RECEPCION', 'MEDICO', 'ENFERMERIA', 'TRABAJO_SOCIAL', 'ADMIN'];

type Area = keyof Visibilidad | 'todos';

/** Laboratorio solo aparece en instituciones con ese módulo; lo clínico solo para los roles que lo pueden leer. */
const PESTANAS: { clave: Pestana; etiqueta: string; Icono: typeof Stethoscope; area: Area; n: (e: Expediente) => number | null }[] = [
  { clave: 'resumen', etiqueta: 'Resumen', Icono: ClipboardList, area: 'todos', n: () => null },
  { clave: 'consultas', etiqueta: 'Consultas', Icono: Stethoscope, area: 'consultas', n: (e) => e.consultas.datos?.length ?? null },
  { clave: 'citas', etiqueta: 'Citas', Icono: CalendarDays, area: 'citas', n: (e) => e.citas.datos?.length ?? null },
  { clave: 'recetas', etiqueta: 'Recetas', Icono: Pill, area: 'recetas', n: (e) => e.recetas.datos?.length ?? null },
  { clave: 'laboratorio', etiqueta: 'Laboratorio', Icono: FlaskConical, area: 'laboratorio', n: (e) => e.examenes.datos?.length ?? null },
  { clave: 'social', etiqueta: 'Perfil social', Icono: Users, area: 'todos', n: () => null },
];

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
  const [pestana, setPestana] = useState<Pestana>('resumen');
  const conLaboratorio = perfil?.institucion.clave === 'laboratorio';
  const rolSesion = perfil?.usuario.rol;
  const ver: Visibilidad = {
    consultas: rolSesion !== undefined && ROLES_CONSULTAS.includes(rolSesion),
    recetas: rolSesion !== undefined && ROLES_RECETAS_LAB.includes(rolSesion),
    laboratorio: rolSesion !== undefined && ROLES_RECETAS_LAB.includes(rolSesion),
    citas: rolSesion !== undefined && ROLES_CITAS.includes(rolSesion),
  };
  const exp = useExpediente(id, conLaboratorio, ver);

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
        {PESTANAS.filter((t) => (t.clave !== 'laboratorio' || conLaboratorio) && (t.area === 'todos' || ver[t.area])).map(({ clave, etiqueta, Icono, n }) => (
          <button key={clave} className="rc-tab" role="tab" aria-selected={pestana === clave} onClick={() => setPestana(clave)}>
            <Icono strokeWidth={1.75} aria-hidden="true" />
            {etiqueta}
            {n(exp) !== null && <span className="rc-badge rc-badge--soft">{n(exp)}</span>}
          </button>
        ))}
      </div>
      <div className="split">
        <div className="col">
          {pestana === 'resumen' && (
            <>
              {ver.consultas && (
                <section className="rc-card" style={{ padding: 0, gap: 0 }}>
                  <div className="card-h">
                    <h2 className="rc-card__title">Consultas recientes</h2>
                    <button className="rc-link" onClick={() => setPestana('consultas')}>Ver todas</button>
                  </div>
                  <TablaConsultas c={exp.consultas} limite={3} />
                </section>
              )}
              {ver.recetas && (
                <section className="rc-card">
                  <div className="rc-card__header"><h2 className="rc-card__title">Recetas recientes</h2></div>
                  <ListaRecetas c={{ ...exp.recetas, datos: exp.recetas.datos?.slice(0, 1) ?? null }} />
                </section>
              )}
              {!ver.consultas && ver.citas && (
                <section className="rc-card" style={{ padding: 0, gap: 0 }}>
                  <div className="card-h"><h2 className="rc-card__title">Próximas citas</h2></div>
                  <PanelCitas c={exp.citas} />
                </section>
              )}
            </>
          )}
          {pestana === 'consultas' && <section className="rc-card" style={{ padding: 0, gap: 0 }}><div className="card-h"><h2 className="rc-card__title">Consultas</h2></div><TablaConsultas c={exp.consultas} /></section>}
          {pestana === 'citas' && <section className="rc-card" style={{ padding: 0, gap: 0 }}><div className="card-h"><h2 className="rc-card__title">Citas</h2></div><PanelCitas c={exp.citas} /></section>}
          {pestana === 'recetas' && <ListaRecetas c={exp.recetas} />}
          {pestana === 'laboratorio' && conLaboratorio && <section className="rc-card" style={{ padding: 0, gap: 0 }}><div className="card-h"><h2 className="rc-card__title">Laboratorio</h2></div><PanelLaboratorio c={exp.examenes} /></section>}
          {pestana === 'social' && <PerfilSocial p={p} />}
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
