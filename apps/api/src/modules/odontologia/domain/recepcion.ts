import { ESTADOS_ACTIVOS, HORARIOS, type EstadoCita } from '@red-clinica/shared';
import { ReglaDeNegocio } from '../../../shared/errores.js';

export const aMinutos = (hora: string) => {
  const [h, m] = hora.split(':').map(Number);
  return h! * 60 + m!;
};

/** La jornada es la misma del módulo agenda (bloques de 30 minutos), para no ofrecer un turno que agenda rechace. */
export const horariosDelDia = (): string[] => HORARIOS;

/**
 * Primer turno libre a partir de `desde` (minutos del día) para alguno de los odontólogos.
 * `ocupados` lleva, por odontólogo, las horas con una cita que no fue cancelada.
 * Gana la hora más temprana; si empatan, el odontólogo con menos turnos ese día.
 */
export function siguienteTurnoLibre(
  odontologos: string[],
  ocupados: Map<string, Set<string>>,
  desde: number,
): { hora: string; idOdontologo: string } | null {
  for (const hora of horariosDelDia()) {
    if (aMinutos(hora) < desde) continue;
    const libres = odontologos.filter((id) => !ocupados.get(id)?.has(hora));
    if (libres.length) {
      libres.sort((a, b) => (ocupados.get(a)?.size ?? 0) - (ocupados.get(b)?.size ?? 0));
      return { hora, idOdontologo: libres[0]! };
    }
  }
  return null;
}

/**
 * "Paola Lima Cruz" → nombres "Paola", apellidos "Lima Cruz".
 * Con cuatro palabras o más se toman dos nombres ("María José López Ramírez").
 * Las partículas (de, del, la) se quedan con el apellido que las sigue.
 */
export function dividirNombre(nombreCompleto: string): { nombres: string; apellidos: string } {
  const palabras = nombreCompleto.trim().split(/\s+/);
  if (palabras.length < 2) throw new ReglaDeNegocio('Escriba al menos un nombre y un apellido.');
  const particulas = new Set(['de', 'del', 'la', 'las', 'los', 'y']);
  const significativas = palabras.filter((p) => !particulas.has(p.toLowerCase())).length;
  const cuantosNombres = significativas >= 4 ? 2 : 1;
  const nombres = palabras.slice(0, cuantosNombres).join(' ');
  return { nombres: capitalizar(nombres), apellidos: capitalizar(palabras.slice(cuantosNombres).join(' ')) };
}

const capitalizar = (t: string) =>
  t.split(' ').map((p) => (['de', 'del', 'la', 'las', 'los', 'y'].includes(p.toLowerCase()) ? p.toLowerCase() : p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())).join(' ');

/** Solo las citas activas ocupan el horario: misma regla que el módulo agenda. */
export const liberaHorario = (estado: EstadoCita) => !ESTADOS_ACTIVOS.includes(estado);

/** Zona horaria de la clínica: la fecha de "hoy" y la hora actual no dependen del reloj del servidor. */
export const ZONA_CLINICA = 'America/Guatemala';
const formato = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONA_CLINICA, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

export function relojClinica(d: Date): { fecha: string; minutos: number } {
  const p = Object.fromEntries(formato.formatToParts(d).map((x) => [x.type, x.value]));
  return { fecha: `${p.year}-${p.month}-${p.day}`, minutos: Number(p.hour) * 60 + Number(p.minute) };
}
