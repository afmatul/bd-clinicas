import type { Departamento, DirectorioQuery, Especialidad, Profesional, RegistrarProfesionalInput } from '@red-clinica/shared';

/**
 * Puerto del módulo personal. Hospital: medico + medico_especialidad + especialidad + departamento.
 * Pediátrico: pediatra (sin especialidades: todos son pediatras). Laboratorio y odontológica:
 * documentos de personal con sus especialidades embebidas como texto.
 */
export interface PersonalRepository {
  directorio(filtro: DirectorioQuery): Promise<Profesional[]>;
  obtener(id: string): Promise<Profesional | null>;
  existeColegiado(numeroColegiado: string): Promise<boolean>;
  /** Devuelve el id nuevo. En el hospital, especialidades son ids; en las demás, nombres. */
  registrar(input: RegistrarProfesionalInput): Promise<string>;
  especialidades(): Promise<Especialidad[]>;
  departamentos(): Promise<Departamento[]>;
  /** Solo hospital (tabla puente medico_especialidad). Idempotente. */
  asignarEspecialidad(idProfesional: string, idEspecialidad: string): Promise<void>;
  quitarEspecialidad(idProfesional: string, idEspecialidad: string): Promise<void>;
}
