import { ESTADOS_ACTIVOS, HORARIOS, type CitaDetalle, type EstadoCita } from '@red-clinica/shared';
import { ReglaDeNegocio } from '../../../shared/errores.js';

/** Transiciones permitidas. ATENDIDA solo llega al cerrar la consulta (módulo atencion). */
export const TRANSICIONES: Record<EstadoCita, EstadoCita[]> = {
  PROGRAMADA: ['CONFIRMADA', 'EN_CONSULTA', 'CANCELADA', 'NO_ASISTIO'],
  CONFIRMADA: ['EN_CONSULTA', 'CANCELADA', 'NO_ASISTIO'],
  EN_CONSULTA: ['ATENDIDA'],
  ATENDIDA: [],
  NO_ASISTIO: [],
  CANCELADA: [],
};

/** Estados desde los que se puede llegar a `a`. */
export const origenesDe = (a: EstadoCita) =>
  (Object.keys(TRANSICIONES) as EstadoCita[]).filter((e) => TRANSICIONES[e].includes(a));

const ETIQUETA: Record<EstadoCita, string> = {
  PROGRAMADA: 'programada', CONFIRMADA: 'confirmada', EN_CONSULTA: 'en consulta',
  ATENDIDA: 'atendida', NO_ASISTIO: 'marcada como inasistencia', CANCELADA: 'cancelada',
};

export function validarTransicion(actual: EstadoCita, nuevo: EstadoCita): void {
  if (!TRANSICIONES[actual].includes(nuevo)) {
    throw new ReglaDeNegocio(`La cita ya está ${ETIQUETA[actual]}; no puede pasar a ${ETIQUETA[nuevo]}.`);
  }
}

/** Reglas de agendamiento que no dependen del motor. `ahora` = yyyy-mm-ddTHH:mm local. */
export function validarAgendamiento(fecha: string, hora: string, ahora: string): void {
  if (!HORARIOS.includes(hora)) {
    throw new ReglaDeNegocio(`Elija un horario de la jornada (${HORARIOS[0]} a ${HORARIOS[HORARIOS.length - 1]}, cada 30 minutos).`);
  }
  if (`${fecha}T${hora}` < ahora) throw new ReglaDeNegocio('No se puede agendar en una fecha u hora que ya pasó.');
  if (new Date(`${fecha}T12:00:00Z`).getUTCDay() === 0) throw new ReglaDeNegocio('No hay consulta los domingos.');
}

/** Horarios sin cita activa. Una cita cancelada o con inasistencia libera su horario. */
export function horariosLibres(citas: Pick<CitaDetalle, 'hora' | 'estado'>[], fecha: string, ahora: string): string[] {
  const ocupados = new Set(citas.filter((c) => ESTADOS_ACTIVOS.includes(c.estado)).map((c) => c.hora));
  return HORARIOS.filter((h) => !ocupados.has(h) && `${fecha}T${h}` >= ahora);
}

export const esActiva = (e: EstadoCita) => ESTADOS_ACTIVOS.includes(e);
