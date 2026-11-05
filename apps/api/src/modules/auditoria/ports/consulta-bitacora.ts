import type { AccesoPaciente, ConsultarBitacoraQuery, EntradaBitacora } from '@red-clinica/shared';

/**
 * Lectura de la bitácora. Separado de Bitacora (solo inserción) para que ningún módulo
 * de negocio dependa de la lectura. Siempre acotado a una institución.
 */
export interface ConsultaBitacora {
  buscar(idInstitucion: string, q: ConsultarBitacoraQuery): Promise<{ items: EntradaBitacora[]; total: number }>;
  accesosAPaciente(idInstitucion: string, idPaciente: string): Promise<AccesoPaciente[]>;
}
