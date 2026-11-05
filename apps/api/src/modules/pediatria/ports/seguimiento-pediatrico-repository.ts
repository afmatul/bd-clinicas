import type {
  AplicarDosisInput, Dosis, DosisVencida, Medicion, RegistrarMedicionInput, Responsable, Vacuna,
} from '@red-clinica/shared';
import type { Percentiles } from '../domain/crecimiento.js';

/** Lo que el módulo necesita del menor: lo lee de sus propias tablas, sin pasar por el módulo pacientes. */
export interface MenorPediatrico {
  id: string;
  fechaNacimiento: string;
  sexo: string | null;
  estado: 'ACTIVO' | 'BAJA';
  baja: { fecha: string; motivo: string; pediatra: string | null } | null;
}

export type NuevaMedicion = Omit<RegistrarMedicionInput, keyof Percentiles> & Percentiles;

/**
 * Puerto del módulo pediatria. Solo existe en el Centro pediátrico (MySQL).
 * Cada escritura es una sola sentencia; las UNIQUE de la base cuidan los duplicados concurrentes.
 */
export interface SeguimientoPediatricoRepository {
  menor(idPaciente: string): Promise<MenorPediatrico | null>;
  /** UNIQUE (paciente, fecha): una medición por día. Devuelve el id nuevo. */
  registrarMedicion(idPaciente: string, m: NuevaMedicion): Promise<string>;
  /** Mediciones de la más reciente a la más antigua (sin edad: la calcula el caso de uso). */
  curva(idPaciente: string): Promise<Omit<Medicion, 'edadMeses'>[]>;
  vacunas(): Promise<Vacuna[]>;
  vacuna(idVacuna: string): Promise<Vacuna | null>;
  dosisDelPaciente(idPaciente: string): Promise<(Dosis & { idVacuna: string })[]>;
  /** UNIQUE (paciente, vacuna, dosis). Devuelve el id nuevo. */
  aplicarDosis(idPaciente: string, d: AplicarDosisInput): Promise<string>;
  responsables(idPaciente: string): Promise<Responsable[]>;
  /** Última dosis por paciente y vacuna con esquema incompleto y próxima dosis anterior a `hasta`. Solo activos. */
  dosisVencidas(hasta: string): Promise<DosisVencida[]>;
}
