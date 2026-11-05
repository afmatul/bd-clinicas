import type { EstadoTurno } from '@red-clinica/shared';

export interface Odontologo { id: string; nombre: string }

export interface TurnoDatos {
  id: string;
  idPaciente: string;
  idOdontologo: string;
  fecha: string; // yyyy-mm-dd
  hora: string;  // HH:mm
  motivo: string | null;
  estado: EstadoTurno;
  llegada: string | null;
}

export interface PacienteRapido {
  nombres: string;
  apellidos: string;
  telefono: string;
  fechaNacimiento: string;
}

/**
 * Lecturas y escrituras propias de la recepción de la clínica. Agendar no está aquí: pasa por los
 * casos de uso del módulo agenda (token AGENDA), donde vive la regla del choque de horario.
 * turnosDelDia lee los mismos documentos cita que agenda porque necesita `llegada_en`, que es de
 * odontología y que el adaptador de agenda conserva al reescribir la cita.
 */
export interface RecepcionRepository {
  odontologos(): Promise<Odontologo[]>;
  turnosDelDia(fecha: string): Promise<TurnoDatos[]>;
  nombresDePacientes(ids: string[]): Promise<Map<string, { nombres: string; apellidos: string }>>;
  registrarPaciente(p: PacienteRapido): Promise<string>;
  /** null si la cita no existe. */
  obtenerTurno(id: string): Promise<TurnoDatos | null>;
  marcarLlegada(id: string, cuando: string): Promise<void>;
}
