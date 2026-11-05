// Puerto del módulo laboratorio. Pendiente de implementar: ver README.md del módulo.

export interface TipoExamen {
  id: string; clave: 'hematologia' | 'orina' | 'urocultivo' | 'quimica'; nombre: string;
  campos: { nombre: string; unidad?: string; rangoMin?: number; rangoMax?: number }[];
}
export interface Examen {
  id: string; idPaciente: string; tipo: TipoExamen['clave'];
  estado: 'PENDIENTE' | 'EN_PROCESO' | 'VALIDADO'; fechaOrden: string;
  resultados: Record<string, unknown> | null; // forma según el tipo, validada con $jsonSchema
}

export interface ExamenRepository {
  tipos(): Promise<TipoExamen[]>; // la web arma el formulario desde aquí
  ordenar(idPaciente: string, tipo: TipoExamen['clave']): Promise<string>;
  capturarResultado(id: string, resultados: Record<string, unknown>): Promise<void>;
  porPaciente(idPaciente: string): Promise<Examen[]>;
}
