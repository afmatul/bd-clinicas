import { z } from 'zod';
import { Id } from './pacientes.js';

export const EstadoCita = z.enum(['PROGRAMADA', 'CONFIRMADA', 'EN_CONSULTA', 'ATENDIDA', 'NO_ASISTIO', 'CANCELADA']);
export type EstadoCita = z.infer<typeof EstadoCita>;

/** Estados que ocupan el horario del médico (los demás lo liberan). */
export const ESTADOS_ACTIVOS: EstadoCita[] = ['PROGRAMADA', 'CONFIRMADA', 'EN_CONSULTA'];

/** Jornada de consulta: bloques de 30 minutos de 07:00 a 16:30. Igual en las cuatro instituciones. */
export const DURACION_CITA_MIN = 30;
export const HORARIOS: string[] = Array.from({ length: 20 }, (_, i) => {
  const m = 7 * 60 + i * DURACION_CITA_MIN;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
});

const fecha = z.string().date('Use una fecha válida.');
const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use una hora válida (HH:mm).');

export const CitaDetalle = z.object({
  id: Id,
  idPaciente: Id,
  paciente: z.object({ nombres: z.string(), apellidos: z.string(), cui: z.string().nullable() }),
  idMedico: Id,
  idEspecialidad: Id.nullable(),
  fecha: z.string(), // yyyy-mm-dd
  hora: z.string(), // HH:mm
  motivo: z.string().nullable(),
  estado: EstadoCita,
});
export type CitaDetalle = z.infer<typeof CitaDetalle>;

/** GET /agenda: citas de un médico en un rango (la vista Día pide un día; la vista Semana, seis). */
export const AgendaQuery = z.object({
  idMedico: Id.optional(), // por omisión, el médico de la sesión
  desde: fecha,
  hasta: fecha.optional(),
});
export type AgendaQuery = z.infer<typeof AgendaQuery>;

export const DisponibilidadQuery = z.object({ idMedico: Id, fecha });
export type DisponibilidadQuery = z.infer<typeof DisponibilidadQuery>;

export const Disponibilidad = z.object({ fecha: z.string(), idMedico: Id, libres: z.array(z.string()) });
export type Disponibilidad = z.infer<typeof Disponibilidad>;

export const AgendarCitaInput = z.object({
  idPaciente: Id,
  idMedico: Id,
  idEspecialidad: Id.optional(),
  fecha,
  hora,
  motivo: z.string().trim().min(3, 'Escriba el motivo de la cita.').max(300, 'Máximo 300 caracteres.'),
});
export type AgendarCitaInput = z.infer<typeof AgendarCitaInput>;

export const CambiarEstadoCitaInput = z.object({
  estado: z.enum(['CONFIRMADA', 'CANCELADA', 'NO_ASISTIO']),
});
export type CambiarEstadoCitaInput = z.infer<typeof CambiarEstadoCitaInput>;
