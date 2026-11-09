'use client';
// Datos por paciente de las pestañas del expediente (consultas, citas, recetas, laboratorio) y sus paneles.
import { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import type { CitaDetalle, ConsultaDetalle, ExamenResumen, PacienteFicha, Receta } from '@red-clinica/shared';
import { ApiError } from '../../api/cliente';
import { historialConsultas, recetasDelPaciente } from '../../api/atencion';
import { proximasDelPaciente } from '../../api/agenda';
import { listarExamenes } from '../../api/laboratorio';
import { formatoFecha, formatoFechaHora } from '../../datos/formato';

/** `restringido`: el rol de la sesión no tiene acceso a esta información (403); no es una falla. */
export interface Carga<T> { datos: T[] | null; error: boolean; restringido?: boolean }
export interface Expediente {
  consultas: Carga<ConsultaDetalle>;
  citas: Carga<CitaDetalle>;
  recetas: Carga<Receta>;
  examenes: Carga<ExamenResumen>;
}

const VACIA = <T,>(): Carga<T> => ({ datos: null, error: false });

function cargar<T>(origen: Promise<T[]>, poner: (c: Carga<T>) => void): void {
  origen
    .then((datos) => poner({ datos: Array.isArray(datos) ? datos : [], error: false }))
    .catch((e: unknown) => {
      const restringido = e instanceof ApiError && e.status === 403;
      poner({ datos: [], error: !restringido, restringido });
    });
}

/** Qué partes del expediente puede ver el rol de la sesión (espeja los permisos de la API). */
export interface Visibilidad { consultas: boolean; recetas: boolean; laboratorio: boolean; citas: boolean }

const SIN_ACCESO = <T,>(): Carga<T> => ({ datos: [], error: false });

/**
 * Carga en paralelo lo que cada pestaña necesita. Laboratorio solo se pide si la institución lo tiene,
 * y lo clínico (consultas, recetas, laboratorio) solo si el rol puede verlo: no se piden datos vedados.
 */
export function useExpediente(idPaciente: string, conLaboratorio: boolean, ver: Visibilidad): Expediente {
  const [consultas, setConsultas] = useState<Carga<ConsultaDetalle>>(VACIA);
  const [citas, setCitas] = useState<Carga<CitaDetalle>>(VACIA);
  const [recetas, setRecetas] = useState<Carga<Receta>>(VACIA);
  const [examenes, setExamenes] = useState<Carga<ExamenResumen>>(VACIA);
  useEffect(() => {
    if (ver.consultas) cargar(historialConsultas(idPaciente), setConsultas);
    else setConsultas(SIN_ACCESO());
    if (ver.recetas) cargar(recetasDelPaciente(idPaciente), setRecetas);
    else setRecetas(SIN_ACCESO());
    if (ver.citas) cargar(proximasDelPaciente(idPaciente), setCitas);
    else setCitas(SIN_ACCESO());
    if (conLaboratorio && ver.laboratorio) cargar(listarExamenes({ idPaciente }).then((l) => l.items), setExamenes);
    else setExamenes(SIN_ACCESO());
  }, [idPaciente, conLaboratorio, ver.consultas, ver.recetas, ver.laboratorio, ver.citas]);
  return { consultas, citas, recetas, examenes };
}

function Estado<T>({ c, vacio, children }: { c: Carga<T>; vacio: string; children: (d: T[]) => React.ReactNode }) {
  if (!c.datos) return <span className="rc-skeleton" style={{ display: 'block', height: '64px' }} />;
  if (c.restringido) return <span className="muted small">Su rol no tiene acceso a esta información.</span>;
  if (c.error) return <div className="rc-alert rc-alert--danger" role="alert"><div className="rc-alert__body"><span className="rc-alert__title">No pudimos cargar esta sección</span><span className="rc-alert__text">Intente de nuevo en unos segundos.</span></div></div>;
  if (!c.datos.length) return <span className="muted small">{vacio}</span>;
  return <>{children(c.datos)}</>;
}

const diagnosticoDe = (c: ConsultaDetalle) => c.diagnosticos.map((d) => d.enfermedadDetectada).filter(Boolean).join(', ') || '—';

export function TablaConsultas({ c, limite }: { c: Carga<ConsultaDetalle>; limite?: number }) {
  return (
    <Estado c={c} vacio="Sin consultas registradas.">
      {(items) => (
        <div className="rc-table-wrap flat">
          <table className="rc-table">
            <thead>
              <tr><th>Fecha</th><th>Motivo</th><th className="hide-sm">Diagnóstico</th><th className="hide-sm">Estado</th></tr>
            </thead>
            <tbody>
              {items.slice(0, limite).map((x) => (
                <tr key={x.id}>
                  <td className="rc-num">{formatoFecha(x.fecha)}</td>
                  <td>{x.motivo ?? '—'}</td>
                  <td className="hide-sm">{diagnosticoDe(x)}</td>
                  <td className="hide-sm">{x.cerrada ? 'Cerrada' : 'En borrador'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Estado>
  );
}

export function PanelCitas({ c }: { c: Carga<CitaDetalle> }) {
  return (
    <Estado c={c} vacio="Sin citas próximas.">
      {(items) => (
        <div className="rc-table-wrap flat">
          <table className="rc-table">
            <thead><tr><th>Fecha</th><th>Hora</th><th>Motivo</th><th>Estado</th></tr></thead>
            <tbody>
              {items.map((x) => (
                <tr key={x.id}><td className="rc-num">{formatoFecha(x.fecha)}</td><td className="rc-num">{x.hora}</td><td>{x.motivo ?? '—'}</td><td>{x.estado}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Estado>
  );
}

export function ListaRecetas({ c }: { c: Carga<Receta> }) {
  return (
    <Estado c={c} vacio="Sin recetas emitidas.">
      {(items) => (
        <div className="list">
          {items.map((r) => (
            <section className="rc-card" key={r.id}>
              <div className="rc-card__header">
                <div>
                  <h3 className="rc-card__title">Receta del {formatoFecha(r.fechaEmision)}</h3>
                  {r.diagnostico && <p className="rc-card__sub">{r.diagnostico}</p>}
                </div>
              </div>
              {r.renglones.map((g, i) => (
                <div className="rx" key={i}>
                  <div>
                    <b>{g.medicamento.nombre} {g.medicamento.concentracion ?? ''}</b>
                    {g.medicamento.presentacion ? ` · ${g.medicamento.presentacion}` : ''}{g.viaAdministracion ? ` · ${g.viaAdministracion}` : ''}
                    <div className="muted">
                      {[g.frecuenciaHoras ? `cada ${g.frecuenciaHoras} horas` : null, g.duracionDias ? `${g.duracionDias} días` : null, g.indicaciones].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  {g.cantidad != null && <span className="rc-tag rc-num">{g.cantidad} u</span>}
                </div>
              ))}
              {r.observaciones && <span className="muted small">{r.observaciones}</span>}
            </section>
          ))}
        </div>
      )}
    </Estado>
  );
}

export function PanelLaboratorio({ c }: { c: Carga<ExamenResumen> }) {
  return (
    <Estado c={c} vacio="Sin exámenes de laboratorio.">
      {(items) => (
        <div className="rc-table-wrap flat">
          <table className="rc-table">
            <thead><tr><th>Orden</th><th>Examen</th><th>Estado</th><th className="hide-sm">Actualizado</th></tr></thead>
            <tbody>
              {items.map((x) => (
                <tr key={x.id}>
                  <td className="rc-num">{x.codigo}</td>
                  <td>{x.nombre}{x.critico && <span className="rc-tag rc-tag--danger" style={{ marginLeft: 8 }}>Crítico</span>}</td>
                  <td>{x.estado}</td>
                  <td className="hide-sm rc-num">{formatoFechaHora(x.fechaActualizacion)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Estado>
  );
}

/** El modelo de datos aún no guarda un perfil social; se muestra lo demográfico y de contacto que sí existe. */
export function PerfilSocial({ p }: { p: PacienteFicha }) {
  const filas: [string, string][] = [
    ['Procedencia', p.procedencia ?? '—'],
    ['Dirección', p.direccion ?? '—'],
    ['Teléfonos', p.telefonos.join(', ') || p.telefono || '—'],
    ['Correos', p.emails.join(', ') || '—'],
  ];
  return (
    <section className="rc-card">
      <div className="rc-card__header"><h2 className="rc-card__title">Perfil social</h2></div>
      <dl className="rc-dl">
        {filas.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
      </dl>
      <span className="muted small">Ocupación, escolaridad y red de apoyo todavía no se registran en el expediente.</span>
    </section>
  );
}
