import type { EstadoExamen, ListarExamenesQuery, TipoExamen, TipoExamenClave } from '@red-clinica/shared';
import type { Resultados } from '../domain/examen.js';

/** Quién capturó o validó, con la fecha (ISO). */
export interface Firma { idUsuario: string; nombre: string; fecha: string }

export interface ExamenDatos {
  id: string;
  codigo: string;
  tipo: TipoExamenClave;
  nombre: string;
  estado: EstadoExamen;
  critico: boolean;
  fechaOrden: string;
  fechaActualizacion: string;
  paciente: { id: string; nombres: string; apellidos: string; cui: string | null };
  medicoSolicitante: string | null;
  capturadoPor: Firma | null;
  validadoPor: Firma | null;
  observaciones: string | null;
  /** Documento de resultados con la forma de su tipo (ver domain/examen.ts). */
  resultados: Resultados | null;
}

export interface NuevaOrden {
  idPaciente: string;
  tipo: TipoExamenClave;
  nombre: string;
  medicoSolicitante: string | null;
  fecha: Date;
}

/** Puerto del módulo laboratorio. Solo lo implementa MongoDB (Laboratorio clínico). */
export interface ExamenRepository {
  /** Catálogo de tipos: la web arma el formulario de captura desde aquí. */
  tipos(): Promise<TipoExamen[]>;
  listar(q: ListarExamenesQuery): Promise<{ items: ExamenDatos[]; total: number; ultimas48h: number; criticos: number }>;
  obtener(id: string): Promise<ExamenDatos | null>;
  ordenar(o: NuevaOrden): Promise<{ id: string; codigo: string }>;
  /** Escribe los resultados si el examen no está validado. Devuelve false si otro usuario lo validó antes. */
  guardarResultados(id: string, r: { resultados: Resultados; critico: boolean; observaciones: string | null; por: Firma }): Promise<boolean>;
  /** Pasa de EN_PROCESO a VALIDADO. Devuelve false si el estado cambió en medio. */
  validar(id: string, por: Firma): Promise<boolean>;
}
