'use client';

import { useState, type ReactNode } from 'react';
import { CalendarX, CircleCheck, Clock, Stethoscope, UserRound, X } from 'lucide-react';
import { ESTADOS_ACTIVOS, type CitaDetalle } from '@red-clinica/shared';
import { cambiarEstadoCita } from '../api/agenda';
import { useToast } from '../layout/Toasts';
import { fechaSinAnio } from '../datos/formato';
import { MenuAcciones, type AccionMenu } from './MenuAcciones';

type Accion = 'CONFIRMADA' | 'CANCELADA' | 'NO_ASISTIO';

const TOAST: Record<Accion, string> = {
  CONFIRMADA: 'Cita confirmada', CANCELADA: 'Cita cancelada', NO_ASISTIO: 'Inasistencia registrada',
};

/**
 * Acciones de una cita (atender, confirmar, no asistió, cancelar) compartidas por Inicio y Citas.
 * `menu(cita, esMedico)` devuelve el botón de tres puntos; `dialogo` va una sola vez en la vista.
 * Tras un cambio llama a `alCambiar` para que la vista recargue su agenda.
 */
export function useAccionesCita(alCambiar: () => void): {
  menu: (cita: CitaDetalle, esMedico: boolean) => ReactNode;
  dialogo: ReactNode;
  error: string | null;
} {
  const toast = useToast();
  const [confirmar, setConfirmar] = useState<{ cita: CitaDetalle; accion: Accion } | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ejecutar(cita: CitaDetalle, accion: Accion) {
    setGuardando(true);
    setError(null);
    try {
      await cambiarEstadoCita(cita.id, accion);
      toast(TOAST[accion], `${cita.paciente.nombres} ${cita.paciente.apellidos} · ${fechaSinAnio(cita.fecha)}, ${cita.hora}.`);
      alCambiar();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setConfirmar(null);
      setGuardando(false);
    }
  }

  const menu = (cita: CitaDetalle, esMedico: boolean) => {
    const nombre = `${cita.paciente.nombres} ${cita.paciente.apellidos}`;
    const acciones: AccionMenu[] = [];
    if (ESTADOS_ACTIVOS.includes(cita.estado)) {
      if (esMedico) {
        acciones.push({
          clave: 'atender', etiqueta: cita.estado === 'EN_CONSULTA' ? 'Continuar consulta' : 'Atender',
          icono: <Stethoscope strokeWidth={1.75} aria-hidden="true" />,
          href: `/consulta?${new URLSearchParams({ paciente: cita.idPaciente, cita: cita.id })}`,
        });
      }
      if (cita.estado === 'PROGRAMADA') {
        acciones.push({ clave: 'confirmar', etiqueta: 'Confirmar', icono: <CircleCheck strokeWidth={1.75} aria-hidden="true" />, onSelect: () => void ejecutar(cita, 'CONFIRMADA') });
      }
      if (cita.estado !== 'EN_CONSULTA') {
        acciones.push(
          { clave: 'no-asistio', etiqueta: 'No asistió', icono: <Clock strokeWidth={1.75} aria-hidden="true" />, onSelect: () => setConfirmar({ cita, accion: 'NO_ASISTIO' }) },
          { clave: 'cancelar', etiqueta: 'Cancelar cita', icono: <CalendarX strokeWidth={1.75} aria-hidden="true" />, peligro: true, onSelect: () => setConfirmar({ cita, accion: 'CANCELADA' }) },
        );
      }
    }
    acciones.push({ clave: 'paciente', etiqueta: 'Ver paciente', icono: <UserRound strokeWidth={1.75} aria-hidden="true" />, href: `/pacientes/${cita.idPaciente}` });
    return <MenuAcciones etiqueta={`Acciones para la cita de ${nombre}`} acciones={acciones} />;
  };

  const dialogo = confirmar && (
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
  );

  return { menu, dialogo, error };
}
