'use client';
// Vista "citas" del prototipo, conectada a GET /api/agenda (mismo JSON en los cuatro motores).
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CalendarX, ChevronDown, ChevronLeft, ChevronRight, MoreVertical, Plus, Stethoscope, X } from 'lucide-react';
import { ESTADOS_ACTIVOS, HORARIOS, type CitaDetalle } from '@red-clinica/shared';
import { useSesion } from '../lib/sesion';
import { useToast } from '../layout/Toasts';
import { agenda, cambiarEstadoCita, listarMedicos, nombreProfesional, type Profesional } from '../api/agenda';
import { PillCita, LEYENDA_CITAS } from '../componentes/EstadoCita';
import { ahoraLocal, diaCorto, diaDelMes, fechaLarga, fechaSinAnio, iniciales, lunesDe, sumarDias, varianteAvatar } from '../datos/formato';

type Vista = 'dia' | 'semana' | 'mes';
type Accion = 'CONFIRMADA' | 'CANCELADA' | 'NO_ASISTIO';

/** Rango que se pide a la API según la vista: semana (lun–sáb) o cuatro semanas desde el lunes. */
function rango(vista: Vista, fecha: string) {
  const lunes = lunesDe(fecha);
  return vista === 'mes' ? { desde: lunes, hasta: sumarDias(lunes, 27) } : { desde: lunes, hasta: sumarDias(lunes, 5) };
}

export default function Citas() {
  const { perfil } = useSesion();
  const toast = useToast();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const ahora = ahoraLocal();
  const fecha = params.get('fecha') ?? ahora.fecha;
  const vista = (params.get('vista') as Vista | null) ?? 'dia';
  const [medicos, setMedicos] = useState<Profesional[] | null>(null);
  const idMedico = params.get('medico') ?? perfil?.usuario.idPersonal ?? medicos?.[0]?.id ?? null;

  const [citas, setCitas] = useState<CitaDetalle[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState<{ cita: CitaDetalle; accion: Accion } | null>(null);
  const [guardando, setGuardando] = useState(false);
  const { desde, hasta } = rango(vista, fecha);

  useEffect(() => {
    if (perfil) listarMedicos(perfil).then(setMedicos).catch((e: Error) => setError(e.message));
  }, [perfil]);

  const cargar = useCallback(() => {
    if (!idMedico) return;
    setError(null);
    agenda({ idMedico, desde, hasta }).then((r) => setCitas(r.citas)).catch((e: Error) => setError(e.message));
  }, [idMedico, desde, hasta]);
  useEffect(() => { setCitas(null); cargar(); }, [cargar]);

  useEffect(() => {
    if (!menu) return;
    const cerrar = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest('[data-menu-cita]')) setMenu(null); };
    document.addEventListener('click', cerrar);
    return () => document.removeEventListener('click', cerrar);
  }, [menu]);

  const cambiar = (cambios: Record<string, string | undefined>) => {
    const p = new URLSearchParams(params);
    for (const [k, v] of Object.entries(cambios)) v ? p.set(k, v) : p.delete(k);
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  };

  const medico = medicos?.find((m) => m.id === idMedico);
  const delDia = useMemo(() => (citas ?? []).filter((c) => c.fecha === fecha), [citas, fecha]);
  const porDia = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of citas ?? []) if (ESTADOS_ACTIVOS.includes(c.estado) || c.estado === 'ATENDIDA') m.set(c.fecha, (m.get(c.fecha) ?? 0) + 1);
    return m;
  }, [citas]);

  // Filas de la vista Día: cada horario de la jornada con sus citas; los libres futuros llevan a agendar.
  const filas = useMemo(() => HORARIOS.flatMap((h): { hora: string; cita: CitaDetalle | null }[] => {
    const enHora = delDia.filter((c) => c.hora === h)
      .sort((a, b) => Number(ESTADOS_ACTIVOS.includes(b.estado)) - Number(ESTADOS_ACTIVOS.includes(a.estado)));
    if (enHora.length) return enHora.map((c) => ({ hora: h, cita: c }));
    return `${fecha}T${h}` >= `${ahora.fecha}T${ahora.hora}` ? [{ hora: h, cita: null }] : [];
  }), [delDia, fecha, ahora.fecha, ahora.hora]);

  const resumen = {
    total: delDia.filter((c) => c.estado !== 'CANCELADA').length,
    atendidas: delDia.filter((c) => c.estado === 'ATENDIDA').length,
    canceladas: delDia.filter((c) => c.estado === 'CANCELADA').length,
    noAsistio: delDia.filter((c) => c.estado === 'NO_ASISTIO').length,
  };
  const cerradas = resumen.atendidas + resumen.noAsistio;
  const avance = resumen.total ? Math.round((cerradas / resumen.total) * 100) : 0;
  const ahoraSlot = HORARIOS.filter((h) => h <= ahora.hora).pop();
  const esMedico = perfil?.usuario.rol === 'MEDICO' && perfil.usuario.idPersonal === idMedico;
  const paso = vista === 'mes' ? 28 : vista === 'semana' ? 7 : 1;
  const linkAgendar = (h: string) => `/nueva-cita?${new URLSearchParams({ ...(idMedico ? { medico: idMedico } : {}), fecha, hora: h })}`;

  async function ejecutar(cita: CitaDetalle, accion: Accion) {
    setGuardando(true);
    try {
      await cambiarEstadoCita(cita.id, accion);
      const quien = `${cita.paciente.nombres} ${cita.paciente.apellidos}`;
      toast(
        accion === 'CONFIRMADA' ? 'Cita confirmada' : accion === 'CANCELADA' ? 'Cita cancelada' : 'Inasistencia registrada',
        `${quien} · ${fechaSinAnio(cita.fecha)}, ${cita.hora}.`,
      );
      setConfirmar(null);
      cargar();
    } catch (e) {
      setError((e as Error).message);
      setConfirmar(null);
    } finally {
      setGuardando(false);
    }
  }

  const tarjetaCita = (c: CitaDetalle) => {
    const nombre = `${c.paciente.nombres} ${c.paciente.apellidos}`;
    const activa = ESTADOS_ACTIVOS.includes(c.estado);
    return (
      <div className="slot__b">
        <Link className="rowlink" href={`/pacientes/${c.idPaciente}`}>
          <div className="rc-person">
          <span className={`rc-avatar rc-avatar--sm ${varianteAvatar(c.idPaciente)}`}>{iniciales(c.paciente.nombres, c.paciente.apellidos)}</span>
          <div className="rc-person__text">
            <span className="rc-person__name">{nombre}</span>
            <span className="rc-person__meta">{c.motivo ?? 'Sin motivo'}</span>
          </div>
          </div>
        </Link>
        <div className="row">
          <PillCita estado={c.estado} />
          {activa && (
            <span data-menu-cita style={{ position: 'relative' }}>
              <button className="rc-btn rc-btn--ghost rc-btn--neutral rc-btn--icon rc-btn--sm" aria-label={`Acciones para la cita de ${nombre}`}
                aria-haspopup="menu" aria-expanded={menu === c.id} onClick={() => setMenu(menu === c.id ? null : c.id)}>
                <MoreVertical strokeWidth={1.75} aria-hidden="true" />
              </button>
              {menu === c.id && (
                <div className="rc-menu" role="menu" style={{ position: 'absolute', right: 0, top: 'calc(100% + 4px)', minWidth: '200px' }}>
                  {esMedico && (
                    <Link className="rc-option" role="menuitem" href={`/consulta?${new URLSearchParams({ paciente: c.idPaciente, cita: c.id })}`}>
                      <Stethoscope strokeWidth={1.75} aria-hidden="true" />{c.estado === 'EN_CONSULTA' ? 'Continuar consulta' : 'Atender'}
                    </Link>
                  )}
                  {c.estado === 'PROGRAMADA' && (
                    <button className="rc-option" role="menuitem" onClick={() => { setMenu(null); void ejecutar(c, 'CONFIRMADA'); }}>Confirmar</button>
                  )}
                  {c.estado !== 'EN_CONSULTA' && (
                    <>
                      <button className="rc-option" role="menuitem" onClick={() => { setMenu(null); setConfirmar({ cita: c, accion: 'NO_ASISTIO' }); }}>No asistió</button>
                      <button className="rc-option" role="menuitem" onClick={() => { setMenu(null); setConfirmar({ cita: c, accion: 'CANCELADA' }); }}>Cancelar cita</button>
                    </>
                  )}
                </div>
              )}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="view">
      <header className="ph">
        <div className="ph__row">
          <div className="ph__text">
            <h1 className="h1">Citas</h1>
            <p>{fechaLarga(fecha)}{medico ? ` · ${nombreProfesional(medico)}` : ''}</p>
          </div>
          <div className="ph__actions">
            <Link className="rc-btn rc-btn--primary" href={`/nueva-cita?${new URLSearchParams({ ...(idMedico ? { medico: idMedico } : {}), fecha: fecha >= ahora.fecha ? fecha : ahora.fecha })}`}>
              <Plus strokeWidth={1.75} aria-hidden="true" />
              Nueva cita
            </Link>
          </div>
        </div>
      </header>
      <div className="rc-toolbar">
        <div className="rc-segmented" role="group" aria-label="Vista" data-controlado>
          {([['dia', 'Día'], ['semana', 'Semana'], ['mes', 'Mes']] as const).map(([v, t]) => (
            <button key={v} aria-pressed={vista === v} onClick={() => cambiar({ vista: v === 'dia' ? undefined : v })}>{t}</button>
          ))}
        </div>
        <div className="row">
          <button className="rc-btn rc-btn--secondary rc-btn--sm rc-btn--icon" aria-label="Anterior" onClick={() => cambiar({ fecha: sumarDias(fecha, -paso) })}>
            <ChevronLeft strokeWidth={1.75} aria-hidden="true" />
          </button>
          <button className="rc-btn rc-btn--secondary rc-btn--sm" onClick={() => cambiar({ fecha: undefined })}>Hoy</button>
          <button className="rc-btn rc-btn--secondary rc-btn--sm rc-btn--icon" aria-label="Siguiente" onClick={() => cambiar({ fecha: sumarDias(fecha, paso) })}>
            <ChevronRight strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
        <span className="rc-toolbar__spacer" />
        <div className="rc-control rc-control--select rc-control--sm">
          <select className="rc-input" aria-label="Médico" value={idMedico ?? ''} onChange={(e) => cambiar({ medico: e.target.value })}>
            {!medicos && <option value={idMedico ?? ''}>Cargando…</option>}
            {medicos?.length === 0 && <option value="">Sin médicos con agenda</option>}
            {medicos?.map((m) => <option key={m.id} value={m.id}>{nombreProfesional(m)}</option>)}
          </select>
          <ChevronDown strokeWidth={1.75} className="rc-chevron" aria-hidden="true" />
        </div>
      </div>
      {vista === 'dia' && (
        <div className="days">
          {Array.from({ length: 6 }, (_, i) => sumarDias(lunesDe(fecha), i)).map((d) => {
            const n = porDia.get(d);
            return (
              <button key={d} className={`day${d < ahora.fecha ? ' is-past' : ''}${d === fecha ? ' is-sel' : ''}`}
                aria-pressed={d === fecha} onClick={() => cambiar({ fecha: d })}>
                <span>{diaCorto(d)}</span><b className="rc-num">{diaDelMes(d)}</b>{n ? <i>{n}</i> : null}
              </button>
            );
          })}
        </div>
      )}
      {error && (
        <div className="rc-alert rc-alert--danger" role="alert">
          <X strokeWidth={1.75} aria-hidden="true" />
          <div className="rc-alert__body"><span className="rc-alert__title">No pudimos actualizar la agenda</span><span className="rc-alert__text">{error}</span></div>
        </div>
      )}
      <div className="split">
        <section className="rc-card agenda" aria-busy={!citas}>
          {!citas && !error && Array.from({ length: 6 }, (_, i) => (
            <div className="slot" key={i}><span className="rc-skeleton" style={{ height: '16px' }} /><span className="rc-skeleton" style={{ height: '44px' }} /></div>
          ))}
          {citas && vista === 'dia' && filas.map(({ hora, cita }) => (
            <div key={cita?.id ?? hora} className={`slot${cita ? '' : ' is-free'}${fecha === ahora.fecha && hora === ahoraSlot && cita && ESTADOS_ACTIVOS.includes(cita.estado) ? ' is-now' : ''}`}>
              <span className="slot__h rc-num">{hora}</span>
              {cita ? tarjetaCita(cita) : (
                <Link className="slot__b free" href={linkAgendar(hora)}>
                  <Plus strokeWidth={1.75} aria-hidden="true" />
                  Disponible · agendar
                </Link>
              )}
            </div>
          ))}
          {citas && vista !== 'dia' && citas.map((c, i) => (
            <div key={c.id}>
              {(i === 0 || citas[i - 1]!.fecha !== c.fecha) && (
                <h2 className="rc-card__title" style={{ padding: '12px 0 4px' }}>
                  <button className="rc-btn rc-btn--ghost rc-btn--sm" onClick={() => cambiar({ fecha: c.fecha, vista: undefined })}>{fechaLarga(c.fecha)}</button>
                </h2>
              )}
              <div className="slot"><span className="slot__h rc-num">{c.hora}</span>{tarjetaCita(c)}</div>
            </div>
          ))}
          {citas && (vista === 'dia' ? filas.length === 0 : citas.length === 0) && (
            <div className="rc-empty">
              <span className="rc-empty__icon"><CalendarX strokeWidth={1.75} aria-hidden="true" /></span>
              <span className="rc-empty__title">Sin citas en este periodo</span>
              <span className="rc-empty__text">Elija otro día o agende una cita nueva.</span>
            </div>
          )}
        </section>
        <aside className="col">
          <div className="rc-card">
            <h2 className="rc-card__title">Resumen del día</h2>
            <dl className="rc-dl">
              <div><dt>Programadas</dt><dd>{resumen.total}</dd></div>
              <div><dt>Atendidas</dt><dd>{resumen.atendidas}</dd></div>
              <div><dt>Canceladas</dt><dd>{resumen.canceladas}</dd></div>
              <div><dt>No asistió</dt><dd>{resumen.noAsistio}</dd></div>
            </dl>
            <div className="rc-meter" role="meter" aria-valuenow={avance} aria-valuemin={0} aria-valuemax={100} aria-label="Avance del día"><span style={{ width: `${avance}%` }} /></div>
            <span className="muted small">{cerradas} de {resumen.total} citas cerradas</span>
          </div>
          <div className="rc-card">
            <h2 className="rc-card__title">Leyenda</h2>
            <div className="tags">{LEYENDA_CITAS.map((e) => <PillCita key={e} estado={e} />)}</div>
          </div>
        </aside>
      </div>
      {confirmar && (
        <div className="rc-scrim" style={{ position: 'fixed', inset: 0 }} onKeyDown={(e) => e.key === 'Escape' && setConfirmar(null)}>
          <div className="rc-modal" role="dialog" aria-modal="true" aria-labelledby="mc-titulo">
            <div className="rc-modal__header">
              <span className="rc-modal__icon"><CalendarX strokeWidth={1.75} aria-hidden="true" /></span>
              <div style={{ flex: 1 }}>
                <h2 className="rc-modal__title" id="mc-titulo">{confirmar.accion === 'CANCELADA' ? '¿Cancelar la cita?' : '¿Marcar inasistencia?'}</h2>
              </div>
              <button className="rc-btn rc-btn--ghost rc-btn--neutral rc-btn--icon rc-btn--sm" aria-label="Cerrar" onClick={() => setConfirmar(null)}>
                <X strokeWidth={1.75} aria-hidden="true" />
              </button>
            </div>
            <div className="rc-modal__body" style={{ paddingLeft: '76px' }}>
              <span>
                La cita de {confirmar.cita.paciente.nombres} {confirmar.cita.paciente.apellidos} del {fechaSinAnio(confirmar.cita.fecha).toLowerCase()} a
                las {confirmar.cita.hora} quedará como <strong>{confirmar.accion === 'CANCELADA' ? 'Cancelada' : 'No asistió'}</strong> y el horario quedará libre.
              </span>
            </div>
            <div className="rc-modal__footer">
              <button className="rc-btn rc-btn--ghost" autoFocus onClick={() => setConfirmar(null)}>Volver</button>
              <button className="rc-btn rc-btn--danger" disabled={guardando} onClick={() => void ejecutar(confirmar.cita, confirmar.accion)}>
                {confirmar.accion === 'CANCELADA' ? 'Cancelar cita' : 'Marcar inasistencia'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
