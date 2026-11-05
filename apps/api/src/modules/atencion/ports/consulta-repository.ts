import type { CerrarConsultaInput, ConsultaDetalle, Medicamento } from '@red-clinica/shared';

export interface NuevaConsulta {
  idPaciente: string;
  idCita: string | null;
  idMedico: string;
  fecha: string; // yyyy-mm-dd
  hora: string; // HH:mm
  motivo: string | null;
}

/**
 * Lo que se escribe al cerrar una consulta: todo o nada. Los renglones de receta llevan los datos
 * del medicamento ya resueltos por prescripcion (Mongo y Couch los copian en el documento).
 */
export interface CierreDeConsulta extends Omit<CerrarConsultaInput, 'confirmarAlergias'> {
  idMedico: string;
  fechaEmision: string;
  medicamentos: Map<string, Medicamento>;
}

export interface ConsultaRepository {
  abrir(datos: NuevaConsulta): Promise<string>;
  obtener(id: string): Promise<ConsultaDetalle | null>;
  /** Consulta sin cerrar del paciente con ese médico (para retomarla en vez de abrir otra). */
  abiertaDe(idPaciente: string, idMedico: string): Promise<ConsultaDetalle | null>;
  guardarBorrador(id: string, datos: { motivo?: string; historiaEnfermedadActual?: string }): Promise<void>;
  /**
   * Atómico en cada motor:
   *   PostgreSQL / MySQL  BEGIN … COMMIT sobre consulta, signos_vitales, diagnostico, tratamiento, receta y receta_detalle,
   *                       con la fila de la consulta bloqueada (FOR UPDATE) para que no se cierre dos veces.
   *   MongoDB             un solo updateOne sobre el documento de la consulta con filtro cerrada: false.
   *   CouchDB             una sola escritura del documento consulta con su _rev (409 si alguien la cambió).
   * Devuelve false si la consulta ya estaba cerrada.
   */
  cerrar(idConsulta: string, cierre: CierreDeConsulta): Promise<boolean>;
  /** Consultas del paciente, de la más reciente a la más antigua. */
  historial(idPaciente: string): Promise<ConsultaDetalle[]>;
}
