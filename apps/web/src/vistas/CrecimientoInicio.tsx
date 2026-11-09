'use client';
// Entrada de "Crecimiento y vacunas": dosis vencidas del centro (GET /api/pediatria/dosis-vencidas)
// y búsqueda del menor para abrir su curva y carné.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CircleCheck, Syringe, Users } from 'lucide-react';
import { CampoBusqueda } from '../componentes/CampoBusqueda';
import type { DosisVencida, PacienteResumen } from '@red-clinica/shared';
import { useSesion } from '../lib/sesion';
import { dosisVencidas } from '../api/pediatria';
import { buscarPacientes } from '../api/pacientes';
import { formatoCui, iniciales, varianteAvatar } from '../datos/formato';
import { diasDeAtraso, edadLarga, formatoFecha } from './crecimiento/formato';

function Persona({ id, nombres, apellidos, meta }: { id: string; nombres: string; apellidos: string; meta: string }) {
  return (
    <Link className="rowlink" href={`/crecimiento/${id}`}>
      <div className="rc-person">
        <span className={`rc-avatar ${varianteAvatar(id)}`}>{iniciales(nombres, apellidos)}</span>
        <div className="rc-person__text">
          <span className="rc-person__name">{nombres} {apellidos}</span>
          <span className="rc-person__meta">{meta}</span>
        </div>
      </div>
    </Link>
  );
}

export default function CrecimientoInicio() {
  const { perfil } = useSesion();
  const [vencidas, setVencidas] = useState<DosisVencida[] | null>(null);
  const [errorVencidas, setErrorVencidas] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [resultados, setResultados] = useState<PacienteResumen[] | null>(null);

  useEffect(() => {
    dosisVencidas().then(setVencidas).catch((e: Error) => setErrorVencidas(e.message));
  }, []);

  useEffect(() => {
    let vigente = true;
    buscarPacientes({ q: q || undefined, estado: 'ACTIVO', porPagina: 8 })
      .then((r) => vigente && setResultados(r.items))
      .catch(() => vigente && setResultados([]));
    return () => { vigente = false; };
  }, [q]);

  return (
    <div className="view">
      <header className="ph">
        <div className="ph__row">
          <div className="ph__text">
            <h1 className="h1">Crecimiento y vacunas</h1>
            <p>{perfil?.institucion.nombre} · Percentiles OMS y esquema de vacunación</p>
          </div>
        </div>
      </header>
      <div className="split">
        <section className="rc-card" style={{ padding: 0, gap: 0 }}>
          <div className="card-h">
            <h2 className="rc-card__title">Dosis vencidas</h2>
            {vencidas && vencidas.length > 0 && <span className="rc-pill rc-pill--danger">{vencidas.length} por aplicar</span>}
          </div>
          {errorVencidas && (
            <div className="rc-alert rc-alert--danger" role="alert" style={{ margin: '0 var(--space-5) var(--space-5)' }}>
              <div className="rc-alert__body"><span className="rc-alert__text">{errorVencidas}</span></div>
            </div>
          )}
          <div className="rc-table-wrap flat">
            <table className="rc-table">
              <thead>
                <tr>
                  <th>Paciente</th>
                  <th>Vacuna</th>
                  <th className="rc-num">Dosis</th>
                  <th className="rc-num hide-sm">Debía aplicarse</th>
                  <th>Atraso</th>
                </tr>
              </thead>
              <tbody>
                {!vencidas && !errorVencidas && Array.from({ length: 3 }, (_, i) => (
                  <tr key={i}><td colSpan={5}><span className="rc-skeleton" style={{ display: 'block', height: '20px' }} /></td></tr>
                ))}
                {vencidas?.map((d) => {
                  const dias = diasDeAtraso(d.fechaProximaDosis);
                  return (
                    <tr key={`${d.idPaciente}-${d.idVacuna}`}>
                      <td><Persona id={d.idPaciente} nombres={d.nombres} apellidos={d.apellidos} meta={edadLarga(d.fechaNacimiento)} /></td>
                      <td>{d.vacuna}</td>
                      <td className="rc-num">{d.numeroDosis} de {d.dosisTotales}</td>
                      <td className="rc-num hide-sm">{formatoFecha(d.fechaProximaDosis)}</td>
                      <td>
                        <span className={`rc-pill ${dias > 30 ? 'rc-pill--danger' : 'rc-pill--warning'}`}>
                          <Syringe strokeWidth={1.75} aria-hidden="true" />
                          {dias} {dias === 1 ? 'día' : 'días'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {vencidas && vencidas.length === 0 && (
              <div className="rc-empty">
                <span className="rc-empty__icon"><CircleCheck strokeWidth={1.75} aria-hidden="true" /></span>
                <span className="rc-empty__title">Ninguna dosis vencida</span>
                <span className="rc-empty__text">Todos los pacientes activos tienen su esquema al día.</span>
              </div>
            )}
          </div>
        </section>
        <aside className="col">
          <section className="rc-card">
            <h2 className="rc-card__title">Abrir expediente</h2>
            <CampoBusqueda valor={q} onBuscar={setQ} className="rc-control rc-control--sm"
              placeholder="Nombre o CUI del paciente" etiqueta="Buscar paciente" />
            <div className="list">
              {!resultados && <span className="rc-skeleton" style={{ display: 'block', height: '40px' }} />}
              {resultados?.map((p) => (
                <Persona key={p.id} id={p.id} nombres={p.nombres} apellidos={p.apellidos}
                  meta={`${edadLarga(p.fechaNacimiento)} · CUI ${formatoCui(p.cui)}`} />
              ))}
              {resultados && resultados.length === 0 && (
                <div className="rc-empty" style={{ padding: 0 }}>
                  <span className="rc-empty__icon"><Users strokeWidth={1.75} aria-hidden="true" /></span>
                  <span className="rc-empty__title">Sin pacientes que coincidan</span>
                </div>
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
