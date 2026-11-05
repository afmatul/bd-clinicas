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
 * Lo que la recepción de la clínica necesita de la agenda y del expediente.
 * Cuando el módulo agenda exporte sus casos de uso, `agendar`, `turnosDelDia` y `marcarLlegada`
 * pasarán a delegar en ellos; el caso de uso de recepción no cambia.
 */
export interface RecepcionRepository {
  odontologos(): Promise<Odontologo[]>;
  turnosDelDia(fecha: string): Promise<TurnoDatos[]>;
  nombresDePacientes(ids: string[]): Promise<Map<string, { nombres: string; apellidos: string }>>;
  registrarPaciente(p: PacienteRapido): Promise<string>;
  /** Lanza Conflicto si el horario de ese odontólogo ya está ocupado. Devuelve el id de la cita. */
  agendar(t: Omit<TurnoDatos, 'id' | 'estado' | 'llegada'>): Promise<string>;
  /** null si la cita no existe. */
  obtenerTurno(id: string): Promise<TurnoDatos | null>;
  marcarLlegada(id: string, cuando: string): Promise<void>;
}
