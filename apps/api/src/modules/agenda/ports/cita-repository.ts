import type { CitaDetalle, EstadoCita } from '@red-clinica/shared';

export type NuevaCita = Pick<CitaDetalle, 'idPaciente' | 'idMedico' | 'idEspecialidad' | 'fecha' | 'hora' | 'motivo'>;

/**
 * Puerto del módulo agenda. Una implementación por motor en adapters/<motor>.
 * El choque de horario lo garantiza cada motor, no la aplicación:
 *   PostgreSQL  índice único parcial (id_medico, fecha, hora) WHERE estado activo
 *   MySQL       columna generada horario_activo + UNIQUE (los NULL no chocan)
 *   MongoDB     índice único parcial { medico_id, fecha, hora }
 *   CouchDB     _id determinista cita:<medico>:<fecha>T<hora> (un 409 = ocupado)
 */
export interface CitaRepository {
  /** Citas de un médico entre dos fechas (inclusive), con el nombre del paciente, ordenadas por fecha y hora. */
  delMedico(idMedico: string, desde: string, hasta: string): Promise<CitaDetalle[]>;
  /** Próximas citas activas del paciente desde una fecha. */
  proximasDelPaciente(idPaciente: string, desde: string): Promise<CitaDetalle[]>;
  obtener(id: string): Promise<CitaDetalle | null>;
  /** Devuelve el id nuevo; lanza Conflicto si el horario ya está tomado. */
  agendar(cita: NuevaCita): Promise<string>;
  /** Cambia el estado solo si el actual es uno de `desde` (control de concurrencia). Devuelve si cambió. */
  cambiarEstado(id: string, desde: EstadoCita[], a: EstadoCita): Promise<boolean>;
  inasistencias(desde: string, hasta: string): Promise<CitaDetalle[]>;
}
