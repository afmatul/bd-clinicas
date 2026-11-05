import { z } from 'zod';
import { Id } from './pacientes.js';

/** Contratos del módulo pediatria (solo Centro pediátrico · MySQL). */

const fecha = z.string().date('Use una fecha válida.');
const percentil = z.coerce.number().min(0).max(100);

export const RegistrarMedicionInput = z.object({
  fecha,
  pesoKg: z.coerce.number({ error: (i) => (i.code === 'invalid_type' ? 'Escriba el peso.' : undefined) }).min(0.3, 'Revise el peso.').max(200, 'Revise el peso.'),
  tallaCm: z.coerce.number({ error: (i) => (i.code === 'invalid_type' ? 'Escriba la talla.' : undefined) }).min(20, 'Revise la talla.').max(220, 'Revise la talla.'),
  perimetroCefalicoCm: z.coerce.number().min(20, 'Revise el perímetro cefálico.').max(70, 'Revise el perímetro cefálico.').optional(),
  observaciones: z.string().trim().max(2000).optional(),
  /**
   * Percentiles leídos de la curva por el pediatra. Solo se usan cuando las tablas OMS
   * no cubren la edad o la talla (p. ej. mayores de 5 años); si las cubren, la API los calcula.
   */
  percentilPesoEdad: percentil.optional(),
  percentilTallaEdad: percentil.optional(),
  percentilPesoTalla: percentil.optional(),
});
export type RegistrarMedicionInput = z.infer<typeof RegistrarMedicionInput>;

export const Medicion = z.object({
  id: Id,
  fecha: z.string(),
  /** Edad en meses cumplidos el día de la medición. */
  edadMeses: z.number().int(),
  pesoKg: z.number().nullable(),
  tallaCm: z.number().nullable(),
  perimetroCefalicoCm: z.number().nullable(),
  percentilPesoEdad: z.number().nullable(),
  percentilTallaEdad: z.number().nullable(),
  percentilPesoTalla: z.number().nullable(),
  observaciones: z.string().nullable(),
});
export type Medicion = z.infer<typeof Medicion>;

export const Vacuna = z.object({ id: Id, nombre: z.string(), dosisTotales: z.number().int() });
export type Vacuna = z.infer<typeof Vacuna>;

export const AplicarDosisInput = z.object({
  idVacuna: Id,
  numeroDosis: z.coerce.number().int().min(1, 'Indique el número de dosis.'),
  fechaAplicacion: fecha,
  lote: z.coerce.number().int().positive('El lote es un número.').optional(),
  fechaProximaDosis: fecha.optional(),
  observaciones: z.string().trim().max(2000).optional(),
});
export type AplicarDosisInput = z.infer<typeof AplicarDosisInput>;

export const Dosis = z.object({
  id: Id,
  numeroDosis: z.number().int(),
  fechaAplicacion: z.string(),
  lote: z.number().nullable(),
  fechaProximaDosis: z.string().nullable(),
  observaciones: z.string().nullable(),
});
export type Dosis = z.infer<typeof Dosis>;

/** COMPLETO: todas las dosis · PENDIENTE: falta alguna y no ha vencido · ATRASADA: la próxima ya venció · SIN_INICIAR. */
export const EstadoVacuna = z.enum(['COMPLETO', 'PENDIENTE', 'ATRASADA', 'SIN_INICIAR']);
export type EstadoVacuna = z.infer<typeof EstadoVacuna>;

export const VacunaEnCarne = Vacuna.extend({
  dosis: z.array(Dosis),
  estado: EstadoVacuna,
  /** Fecha de la siguiente dosis según la última aplicada (null si el esquema está completo o sin fecha). */
  proximaFecha: z.string().nullable(),
  siguienteDosis: z.number().int().nullable(),
});
export type VacunaEnCarne = z.infer<typeof VacunaEnCarne>;

export const Responsable = z.object({
  id: Id,
  nombreCompleto: z.string(),
  parentesco: z.string().nullable(),
  esTutorLegal: z.boolean(),
  telefonos: z.array(z.string()),
});
export type Responsable = z.infer<typeof Responsable>;

/** Expediente pediátrico: curva, carné y responsables, más la baja con el pediatra que la registró. */
export const SeguimientoPediatrico = z.object({
  mediciones: z.array(Medicion),
  carne: z.array(VacunaEnCarne),
  responsables: z.array(Responsable),
  baja: z.object({ fecha: z.string(), motivo: z.string(), pediatra: z.string().nullable() }).nullable(),
});
export type SeguimientoPediatrico = z.infer<typeof SeguimientoPediatrico>;

export const DosisVencida = z.object({
  idPaciente: Id,
  nombres: z.string(),
  apellidos: z.string(),
  fechaNacimiento: z.string(),
  idVacuna: Id,
  vacuna: z.string(),
  numeroDosis: z.number().int(),
  dosisTotales: z.number().int(),
  fechaProximaDosis: z.string(),
});
export type DosisVencida = z.infer<typeof DosisVencida>;

export const DosisVencidasQuery = z.object({ hasta: fecha.optional() });
