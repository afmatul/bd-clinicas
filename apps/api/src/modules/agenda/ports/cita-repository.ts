// Puerto del módulo agenda. Pendiente de implementar: ver README.md del módulo.

export interface Cita {
  id: string;
  idPaciente: string;
  idMedico: string;
  idEspecialidad: string | null; // solo hospital
  fecha: string; // yyyy-mm-dd
  hora: string;  // HH:mm
  motivo: string | null;
  estado: 'PROGRAMADA' | 'CONFIRMADA' | 'EN_CONSULTA' | 'ATENDIDA' | 'NO_ASISTIO' | 'CANCELADA';
}

/** El choque de horario lo garantiza cada motor: índice único parcial (PG, Mongo), columna generada (MySQL), _id determinista (Couch). */
export interface CitaRepository {
  agendaDelDia(idMedico: string, fecha: string): Promise<Cita[]>;
  agendar(cita: Omit<Cita, 'id' | 'estado'>): Promise<string>; // lanza Conflicto si el horario está ocupado
  cambiarEstado(id: string, estado: Cita['estado']): Promise<void>;
  inasistencias(desde: string, hasta: string): Promise<Cita[]>;
}
