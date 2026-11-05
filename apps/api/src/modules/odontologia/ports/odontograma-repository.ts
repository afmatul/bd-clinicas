import type { Odontograma, ProcedimientoPieza } from '@red-clinica/shared';

/**
 * Odontograma actual del paciente en notación FDI. En CouchDB vive embebido en el documento
 * paciente:<id>; el historial sale de los procedimientos de las consultas cerradas.
 */
export interface OdontogramaRepository {
  /** null si el paciente no existe. */
  obtener(idPaciente: string): Promise<Odontograma | null>;
  historial(idPaciente: string): Promise<ProcedimientoPieza[]>;
  /**
   * Relee el documento, aplica `transformar` sobre el odontograma vigente y lo guarda con su _rev.
   * Ante un 409 (otra persona guardó antes) relee y vuelve a aplicar, así las reglas se evalúan
   * siempre contra la versión que realmente se sobrescribe.
   */
  actualizar(idPaciente: string, transformar: (actual: Odontograma) => Odontograma): Promise<Odontograma | null>;
}
