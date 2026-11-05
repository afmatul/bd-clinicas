// Puerto del módulo atencion. Pendiente de implementar: ver README.md del módulo.

export interface SignosVitales {
  presionSistolica?: number; presionDiastolica?: number; frecuenciaCardiaca?: number;
  frecuenciaRespiratoria?: number; saturacionOxigeno?: number; temperaturaC?: number;
}
export interface Diagnostico { tipo: 'PRESUNTIVO' | 'DEFINITIVO'; enfermedadDetectada: string; observaciones?: string }
export interface Tratamiento { tipo: string; descripcion: string; indicaciones?: string; fechaInicio?: string; fechaFin?: string }
export interface RenglonReceta {
  idMedicamento: string; dosis: string; viaAdministracion?: string;
  frecuenciaHoras?: number; duracionDias?: number; cantidad?: number; indicaciones?: string;
}

/** Lo que se escribe al cerrar una consulta: todo o nada. */
export interface CierreDeConsulta {
  signos?: SignosVitales;
  diagnosticos: (Diagnostico & { tratamientos: (Tratamiento & { receta?: RenglonReceta[] })[] })[];
  notasEvolucion?: string;
}

export interface ConsultaRepository {
  abrir(datos: { idPaciente: string; idCita?: string; idMedico: string; motivo: string }): Promise<string>;
  /**
   * PostgreSQL / MySQL: BEGIN … COMMIT sobre diagnostico, tratamiento, receta y receta_detalle.
   * MongoDB: un solo updateOne sobre el documento de la consulta.
   * CouchDB: un solo documento consulta (y el odontograma se reconstruye desde las consultas).
   */
  cerrar(idConsulta: string, cierre: CierreDeConsulta): Promise<void>;
  historial(idPaciente: string): Promise<unknown[]>;
}
