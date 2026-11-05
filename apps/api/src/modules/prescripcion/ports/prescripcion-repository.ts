import type { Medicamento, Receta } from '@red-clinica/shared';

/** Catálogo de medicamentos de la institución. */
export interface MedicamentoRepository {
  /** Por nombre, sin distinguir mayúsculas ni acentos; texto vacío = los primeros del catálogo. */
  buscar(texto: string, limite: number): Promise<Medicamento[]>;
  obtenerVarios(ids: string[]): Promise<Medicamento[]>;
}

/**
 * Lectura de recetas. Se escriben al cerrar la consulta, dentro de la misma unidad atómica
 * (módulo atencion): en SQL en la transacción del cierre, en Mongo y Couch embebidas en la consulta.
 */
export interface RecetaRepository {
  /** Todas las recetas del paciente, de la más reciente a la más antigua. */
  delPaciente(idPaciente: string): Promise<Receta[]>;
}
