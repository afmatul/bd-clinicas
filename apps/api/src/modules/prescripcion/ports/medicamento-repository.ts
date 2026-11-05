// Puerto del módulo prescripcion. Pendiente de implementar: ver README.md del módulo.

export interface Medicamento { id: string; nombre: string; presentacion: string | null; concentracion: string | null }

export interface MedicamentoRepository {
  buscar(texto: string): Promise<Medicamento[]>;
  obtener(id: string): Promise<Medicamento | null>;
}

export interface RecetaRepository {
  /** Recetas vigentes del paciente al momento de una nueva consulta. */
  vigentes(idPaciente: string): Promise<unknown[]>;
  historico(idPaciente: string): Promise<unknown[]>;
}
