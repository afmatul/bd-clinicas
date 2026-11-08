import { z } from 'zod';
import { Id } from './pacientes.js';

/**
 * Contratos del módulo laboratorio (solo Laboratorio clínico · MongoDB).
 * Cada tipo de examen guarda un documento de resultados con forma distinta;
 * la web no conoce esas formas: arma el formulario con el catálogo y la tabla con las secciones.
 */
export const TipoExamenClave = z.enum(['hematologia', 'orina', 'urocultivo', 'quimica']);
export type TipoExamenClave = z.infer<typeof TipoExamenClave>;

export const EstadoExamen = z.enum(['PENDIENTE', 'EN_PROCESO', 'VALIDADO']);
export type EstadoExamen = z.infer<typeof EstadoExamen>;

/** Un campo capturable del catálogo. `seccion` agrupa (orina: físico, químico, sedimento). */
export const CampoExamen = z.object({
  clave: z.string(),
  nombre: z.string(),
  seccion: z.string().nullable(),
  tipo: z.enum(['numero', 'texto', 'opcion']),
  unidad: z.string().nullable(),
  /** Decimales con que se muestran el resultado y la referencia (12.0 – 16.0). */
  decimales: z.number().int().min(0).max(4).nullable(),
  refMin: z.number().nullable(),
  refMax: z.number().nullable(),
  /** Fuera de estos límites el resultado es un valor crítico. */
  criticoMin: z.number().nullable(),
  criticoMax: z.number().nullable(),
  /** Para texto y opción: valor esperado (p. ej. "Negativo"). */
  normal: z.string().nullable(),
  opciones: z.array(z.string()).nullable(),
  obligatorio: z.boolean(),
});
export type CampoExamen = z.infer<typeof CampoExamen>;

export const TipoExamen = z.object({
  clave: TipoExamenClave,
  nombre: z.string(),
  /** Nombre corto del filtro (Hematología, Orina, Cultivo, Química). */
  corto: z.string(),
  muestra: z.string(),
  campos: z.array(CampoExamen),
});
export type TipoExamen = z.infer<typeof TipoExamen>;

export const Interpretacion = z.enum(['NORMAL', 'ALTO', 'BAJO', 'CRITICO_ALTO', 'CRITICO_BAJO', 'ANORMAL', 'SENSIBLE', 'INTERMEDIO', 'RESISTENTE']);
export type Interpretacion = z.infer<typeof Interpretacion>;

/** Una fila de la tabla de resultados, ya interpretada por el dominio. */
export const FilaResultado = z.object({
  parametro: z.string(),
  valor: z.string(),
  unidad: z.string().nullable(),
  referencia: z.string().nullable(),
  interpretacion: Interpretacion.nullable(),
});
export type FilaResultado = z.infer<typeof FilaResultado>;

export const SeccionResultado = z.object({
  titulo: z.string().nullable(),
  columnas: z.enum(['parametro', 'antibiograma']),
  filas: z.array(FilaResultado),
});
export type SeccionResultado = z.infer<typeof SeccionResultado>;

export const ExamenResumen = z.object({
  id: Id,
  codigo: z.string(),
  tipo: TipoExamenClave,
  nombre: z.string(),
  estado: EstadoExamen,
  critico: z.boolean(),
  fechaOrden: z.string(), // ISO con hora
  /** Última fecha relevante: validación, captura u orden. */
  fechaActualizacion: z.string(),
  paciente: z.object({ id: Id, nombres: z.string(), apellidos: z.string(), cui: z.string().nullable() }),
});
export type ExamenResumen = z.infer<typeof ExamenResumen>;

export const ExamenDetalle = ExamenResumen.extend({
  medicoSolicitante: z.string().nullable(),
  capturadoPor: z.object({ nombre: z.string(), fecha: z.string() }).nullable(),
  validadoPor: z.object({ nombre: z.string(), fecha: z.string() }).nullable(),
  observaciones: z.string().nullable(),
  secciones: z.array(SeccionResultado),
  /** El documento de resultados tal como está en MongoDB (forma según el tipo). */
  resultados: z.record(z.string(), z.unknown()).nullable(),
});
export type ExamenDetalle = z.infer<typeof ExamenDetalle>;

export const ListarExamenesQuery = z.object({
  tipo: TipoExamenClave.optional(),
  estado: EstadoExamen.optional(),
  idPaciente: Id.optional(),
  limite: z.coerce.number().int().min(1).max(200).default(50),
});
export type ListarExamenesQuery = z.infer<typeof ListarExamenesQuery>;

export const ListaExamenes = z.object({
  items: z.array(ExamenResumen),
  total: z.number().int(),
  ultimas48h: z.number().int(),
  criticos: z.number().int(),
});
export type ListaExamenes = z.infer<typeof ListaExamenes>;

export const OrdenarExamenInput = z.object({
  idPaciente: Id,
  tipo: TipoExamenClave,
  medicoSolicitante: z.string().trim().max(120).optional(),
});
export type OrdenarExamenInput = z.infer<typeof OrdenarExamenInput>;

/**
 * Resultados capturados desde el formulario: clave del catálogo → valor tal cual lo escribió
 * el usuario. El dominio los convierte a la forma de documento de cada tipo.
 * Urocultivo agrega el antibiograma como lista.
 */
export const CapturarResultadosInput = z.object({
  valores: z.record(z.string(), z.string().trim()),
  antibiograma: z
    .array(z.object({ antibiotico: z.string().trim().min(1), interpretacion: z.enum(['S', 'I', 'R']) }))
    .default([]),
  observaciones: z.string().trim().max(500).optional(),
});
export type CapturarResultadosInput = z.infer<typeof CapturarResultadosInput>;
