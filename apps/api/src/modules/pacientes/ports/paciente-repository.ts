import type { BuscarPacientesQuery, PacienteResumen, RegistrarPacienteInput } from '@red-clinica/shared';
import type { Baja, PacienteDatos } from '../domain/paciente.js';

/**
 * Puerto del módulo pacientes. Una implementación por motor en adapters/<motor>.
 * Cada método es una unidad atómica: transacción en SQL, un solo documento en Mongo y Couch.
 */
export interface PacienteRepository {
  buscar(q: BuscarPacientesQuery): Promise<{ items: PacienteResumen[]; total: number }>;
  obtener(id: string): Promise<PacienteDatos | null>;
  existeCui(cui: string): Promise<boolean>;
  /** Hospital: con teléfonos y correos. Pediátrico: con su primer responsable. Devuelve el id nuevo. */
  registrar(input: RegistrarPacienteInput): Promise<string>;
  darDeBaja(id: string, baja: Baja): Promise<void>;
}
