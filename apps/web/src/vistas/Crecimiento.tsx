'use client';
// Vista "crecimiento" del prototipo, conectada al módulo pediatria (MySQL):
// GET /api/pacientes/:id para la ficha y GET /api/pediatria/pacientes/:id para curva, carné y responsables.
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Baby, ChevronRight, CircleX, Ruler, ShieldAlert, Syringe, TriangleAlert, Weight } from 'lucide-react';
import type { EstadoVacuna, PacienteFicha, SeguimientoPediatrico, VacunaEnCarne } from '@red-clinica/shared';
import { useSesion } from '../lib/sesion';
import { useToast } from '../layout/Toasts';
import { fichaPaciente, seguimientoPediatrico } from '../api/pediatria';
import { formatoSangre, formatoTelefono, iniciales } from '../datos/formato';
import { FormularioDosis, FormularioMedicion } from './crecimiento/Formularios';
import {
  SEXO, decimal, edadCorta, edadLarga, formatoFecha, percentil, percentilFueraDeRango,
} from './crecimiento/formato';

/** Parentescos femeninos, para escribir "tutora legal" como el prototipo. */
const FEMENINO = new Set(['madre', 'abuela', 'tía', 'hermana', 'tutora', 'madrastra']);

const PILL: Record<EstadoVacuna, [string, string]> = {
  COMPLETO: ['rc-pill--success', 'Al día'],
  PENDIENTE: ['rc-pill--warning', 'Dosis pendiente'],
  ATRASADA: ['rc-pill--danger', 'Atrasada'],
  SIN_INICIAR: ['', 'Sin iniciar'],
};

function detalleVacuna(v: VacunaEnCarne): string {
  if (v.estado === 'COMPLETO') return 'Esquema completo';
  if (v.estado === 'ATRASADA') return `Dosis ${v.siguienteDosis} vencida el ${formatoFecha(v.proximaFecha)}`;
  if (v.proximaFecha) return `Próxima: ${formatoFecha(v.proximaFecha)}`;
  return v.estado === 'SIN_INICIAR' ? 'Sin dosis registradas' : `Falta la dosis ${v.siguienteDosis}`;
}

function Percentil({ valor, contexto }: { valor: number | null; contexto: string }) {
  if (valor === null) return <span className="rc-delta__ctx small">Sin percentil · {contexto}</span>;
  return (
    <span className={`rc-delta ${percentilFueraDeRango(valor) ? 'rc-delta--down' : 'rc-delta--up'}`}>
      {percentil(valor)} <span className="rc-delta__ctx">{contexto}</span>
    </span>
  );
}

export default function Crecimiento({ id }: { id: string }) {
  const { perfil } = useSesion();
  const toast = useToast();
  const [ficha, setFicha] = useState<PacienteFicha | null>(null);
  const [seg, setSeg] = useState<SeguimientoPediatrico | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<{ tipo: 'medicion' } | { tipo: 'dosis'; idVacuna?: string } | null>(null);

  const cargarSeguimiento = useCallback(
    () => seguimientoPediatrico(id).then(setSeg).catch((e: Error) => setError(e.message)),
    [id],
  );
  useEffect(() => {
    setError(null);
    fichaPaciente(id).then(setFicha).catch((e: Error) => setError(e.message));
    void cargarSeguimiento();
  }, [id, cargarSeguimiento]);

  const nombre = ficha ? `${ficha.nombres} ${ficha.apellidos}` : '';
  const ultima = seg?.mediciones[0];
  const atrasadas = seg?.carne.filter((v) => v.estado === 'ATRASADA') ?? [];
  const deBaja = ficha?.estado === 'BAJA' || !!seg?.baja;
  const puedeVacunar = !!seg?.carne.some((v) => v.siguienteDosis !== null);

  if (error) {
    return (
      <div className="view">
        <ol className="rc-breadcrumbs" aria-label="Ruta">
          <li><Link href="/crecimiento">Crecimiento y vacunas</Link><ChevronRight strokeWidth={1.75} aria-hidden="true" /></li>
        </ol>
        <div className="rc-alert rc-alert--danger" role="alert">
          <div className="rc-alert__body"><span className="rc-alert__title">No pudimos abrir el expediente pediátrico</span><span className="rc-alert__text">{error}</span></div>
        </div>
      </div>
    );
  }

  return (
    <div className="view">
      <header className="ph">
        <ol className="rc-breadcrumbs" aria-label="Ruta">
          <li>
            <Link href="/pacientes">Pacientes</Link>
            <ChevronRight strokeWidth={1.75} aria-hidden="true" />
          </li>
          <li><span aria-current="page">{nombre || 'Cargando…'}</span></li>
        </ol>
        <div className="ph__row">
          <div className="ph__text">
            <h1 className="h1">{nombre || <span className="rc-skeleton" style={{ display: 'inline-block', width: '240px', height: '28px' }} />}</h1>
            <p>
              {perfil?.institucion.nombre}
              {ficha && ` · ${edadLarga(ficha.fechaNacimiento)} · ${SEXO[ficha.sexo ?? ''] ?? 'Sexo sin registrar'} · ${formatoSangre(ficha.tipoSangre)}`}
            </p>
          </div>
          <div className="ph__actions">
            <button className="rc-btn rc-btn--secondary" disabled={!seg || deBaja || !puedeVacunar} onClick={() => setModal({ tipo: 'dosis' })}>
              <Syringe strokeWidth={1.75} aria-hidden="true" />
              Registrar vacuna
            </button>
            <button className="rc-btn rc-btn--primary" disabled={!seg || !ficha || deBaja} onClick={() => setModal({ tipo: 'medicion' })}>
              <Ruler strokeWidth={1.75} aria-hidden="true" />
              Nueva medición
            </button>
          </div>
        </div>
      </header>
      {seg?.baja && (
        <div className="rc-alert rc-alert--warning" role="status">
          <CircleX strokeWidth={1.75} aria-hidden="true" />
          <div className="rc-alert__body">
            <span className="rc-alert__title">Expediente de baja desde el {formatoFecha(seg.baja.fecha)}</span>
            <span className="rc-alert__text">
              {seg.baja.motivo}{seg.baja.pediatra ? ` · Registrada por ${seg.baja.pediatra}` : ''}. No admite mediciones ni vacunas nuevas.
            </span>
          </div>
        </div>
      )}
      <div className="split">
        <div className="col">
          <div className="stats three">
            <div className="rc-stat">
              <span className="rc-stat__label">
                <span className="rc-stat__icon"><Weight strokeWidth={1.75} aria-hidden="true" /></span>
                Peso
              </span>
              <span className="rc-stat__value">{decimal(ultima?.pesoKg ?? null)}<small>kg</small></span>
              <Percentil valor={ultima?.percentilPesoEdad ?? null} contexto="peso para la edad" />
            </div>
            <div className="rc-stat">
              <span className="rc-stat__label">
                <span className="rc-stat__icon"><Ruler strokeWidth={1.75} aria-hidden="true" /></span>
                Talla
              </span>
              <span className="rc-stat__value">{decimal(ultima?.tallaCm ?? null)}<small>cm</small></span>
              <Percentil valor={ultima?.percentilTallaEdad ?? null} contexto="talla para la edad" />
            </div>
            <div className="rc-stat">
              <span className="rc-stat__label">
                <span className="rc-stat__icon"><Baby strokeWidth={1.75} aria-hidden="true" /></span>
                Perímetro cefálico
              </span>
              <span className="rc-stat__value">{decimal(ultima?.perimetroCefalicoCm ?? null)}<small>cm</small></span>
              <span className="rc-delta__ctx small">
                {ultima ? `Medido el ${formatoFecha(ultima.fecha)}` : 'Sin mediciones'}
              </span>
            </div>
          </div>
          <section className="rc-card" style={{ padding: 0, gap: 0 }}>
            <div className="card-h">
              <h2 className="rc-card__title">Control de crecimiento</h2>
              <span className="muted small">Percentiles OMS</span>
            </div>
            <div className="rc-table-wrap flat">
              <table className="rc-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Edad</th>
                    <th className="rc-num">Peso kg</th>
                    <th className="rc-num">Talla cm</th>
                    <th className="rc-num hide-sm">P. cef. cm</th>
                    <th className="rc-num">Peso/edad</th>
                    <th className="rc-num">Talla/edad</th>
                    <th className="rc-num hide-sm">Peso/talla</th>
                  </tr>
                </thead>
                <tbody>
                  {!seg && Array.from({ length: 4 }, (_, i) => (
                    <tr key={i}><td colSpan={8}><span className="rc-skeleton" style={{ display: 'block', height: '20px' }} /></td></tr>
                  ))}
                  {seg?.mediciones.map((m) => (
                    <tr key={m.id} title={m.observaciones ?? undefined}>
                      <td className="rc-num">{formatoFecha(m.fecha)}</td>
                      <td className="rc-num">{edadCorta(m.edadMeses)}</td>
                      <td className="rc-num">{decimal(m.pesoKg)}</td>
                      <td className="rc-num">{decimal(m.tallaCm)}</td>
                      <td className="rc-num hide-sm">{decimal(m.perimetroCefalicoCm)}</td>
                      <td className={`rc-num${percentilFueraDeRango(m.percentilPesoEdad) ? ' hi' : ''}`}>{percentil(m.percentilPesoEdad)}</td>
                      <td className={`rc-num${percentilFueraDeRango(m.percentilTallaEdad) ? ' hi' : ''}`}>{percentil(m.percentilTallaEdad)}</td>
                      <td className={`rc-num hide-sm${percentilFueraDeRango(m.percentilPesoTalla) ? ' hi' : ''}`}>{percentil(m.percentilPesoTalla)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {seg && seg.mediciones.length === 0 && (
                <div className="rc-empty">
                  <span className="rc-empty__icon"><Ruler strokeWidth={1.75} aria-hidden="true" /></span>
                  <span className="rc-empty__title">Sin mediciones todavía</span>
                  <span className="rc-empty__text">Registre peso y talla en cada control para ver la curva de crecimiento.</span>
                </div>
              )}
            </div>
          </section>
          <section className="rc-card">
            <div className="rc-card__header">
              <h2 className="rc-card__title">Esquema de vacunación</h2>
              {atrasadas.length > 0 && (
                <span className="rc-pill rc-pill--danger">
                  <TriangleAlert strokeWidth={1.75} aria-hidden="true" />
                  {atrasadas.length} {atrasadas.length === 1 ? 'atrasada' : 'atrasadas'}
                </span>
              )}
            </div>
            <div className="vaclist">
              {!seg && Array.from({ length: 4 }, (_, i) => <span key={i} className="rc-skeleton" style={{ display: 'block', height: '36px', marginBottom: '8px' }} />)}
              {seg?.carne.map((v) => {
                const [clase, texto] = PILL[v.estado];
                return (
                  <div className="vac" key={v.id}>
                    <div>
                      <b>{v.nombre}</b>
                      <div className="muted small">{detalleVacuna(v)}</div>
                    </div>
                    <div className="vac__dots" aria-label={`${v.dosis.length} de ${v.dosisTotales} dosis`}>
                      {Array.from({ length: v.dosisTotales }, (_, i) => (
                        <i key={i} className={i < v.dosis.length ? 'on' : undefined}
                          title={v.dosis[i] ? `Dosis ${i + 1}: ${formatoFecha(v.dosis[i]!.fechaAplicacion)}` : undefined} />
                      ))}
                      <span className="rc-num small muted">{v.dosis.length} de {v.dosisTotales}</span>
                    </div>
                    <span className={`rc-pill ${clase}`}>
                      <Syringe strokeWidth={1.75} aria-hidden="true" />
                      {texto}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
        <aside className="col">
          {!deBaja && atrasadas.map((v) => (
            <div className="rc-alert rc-alert--danger" role="alert" key={v.id}>
              <Syringe strokeWidth={1.75} aria-hidden="true" />
              <div className="rc-alert__body">
                <span className="rc-alert__title">{v.nombre} atrasada</span>
                <span className="rc-alert__text">La dosis {v.siguienteDosis} debía aplicarse el {formatoFecha(v.proximaFecha)}.</span>
                <div className="rc-alert__actions">
                  <button className="rc-btn rc-btn--secondary rc-btn--sm" onClick={() => setModal({ tipo: 'dosis', idVacuna: v.id })}>Aplicar hoy</button>
                </div>
              </div>
            </div>
          ))}
          <section className="rc-card">
            <h2 className="rc-card__title">Responsables</h2>
            {!seg && <span className="rc-skeleton" style={{ display: 'block', height: '40px' }} />}
            {seg?.responsables.length === 0 && <span className="muted small">Sin responsables registrados.</span>}
            {seg?.responsables.map((r, i) => {
              const [n = '', ...resto] = r.nombreCompleto.split(' ');
              const meta = [r.parentesco, r.esTutorLegal ? (FEMENINO.has((r.parentesco ?? '').toLowerCase()) ? 'tutora legal' : 'tutor legal') : null, ...r.telefonos.map(formatoTelefono)].filter(Boolean).join(' · ');
              return (
                <div key={r.id} className="col" style={{ gap: 'var(--space-2)' }}>
                  <div className="rc-person">
                    <span className={`rc-avatar ${i === 0 ? '' : 'rc-avatar--neutral'}`}>{iniciales(n, resto.join(' '))}</span>
                    <div className="rc-person__text">
                      <span className="rc-person__name">{r.nombreCompleto}</span>
                      <span className="rc-person__meta">{meta}</span>
                    </div>
                  </div>
                  {r.esTutorLegal && (
                    <span className="rc-tag" style={{ alignSelf: 'flex-start' }}>
                      <ShieldAlert strokeWidth={1.75} aria-hidden="true" />
                      Tutor legal
                    </span>
                  )}
                </div>
              );
            })}
          </section>
          <section className="rc-card">
            <h2 className="rc-card__title">Alergias</h2>
            {!ficha && <span className="rc-skeleton" style={{ display: 'block', height: '24px' }} />}
            {ficha && ficha.alergias.length === 0 && <span className="muted small">Sin alergias registradas.</span>}
            {ficha && ficha.alergias.length > 0 && (
              <div className="tags">
                {ficha.alergias.map((a) => (
                  <span key={a.id} className={`rc-tag ${a.severidad === 'SEVERA' ? 'rc-tag--danger' : 'rc-tag--warning'}`}>
                    <TriangleAlert strokeWidth={1.75} aria-hidden="true" />
                    {a.descripcion ?? a.tipo}{a.severidad ? ` · ${a.severidad.toLowerCase()}` : ''}
                  </span>
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>
      {modal?.tipo === 'medicion' && ficha && (
        <FormularioMedicion idPaciente={id} nacimiento={ficha.fechaNacimiento} onCerrar={() => setModal(null)}
          onGuardada={() => { setModal(null); toast('Medición guardada', `Se agregó al control de crecimiento de ${nombre}.`); void cargarSeguimiento(); }} />
      )}
      {modal?.tipo === 'dosis' && seg && (
        <FormularioDosis idPaciente={id} carne={seg.carne} idVacunaInicial={modal.idVacuna} onCerrar={() => setModal(null)}
          onGuardada={() => { setModal(null); toast('Vacuna registrada', `Se actualizó el carné de vacunación de ${nombre}.`); void cargarSeguimiento(); }} />
      )}
    </div>
  );
}
