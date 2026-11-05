import { z } from 'zod';
import { Id } from './pacientes.js';

// ---------- Prescripción ----------

export const Medicamento = z.object({
  id: Id,
  nombre: z.string(),
  presentacion: z.string().nullable(),
  concentracion: z.string().nullable(),
});
export type Medicamento = z.infer<typeof Medicamento>;

export const BuscarMedicamentosQuery = z.object({ q: z.string().trim().default('') });

const entero = (min: number, max: number, campo: string) =>
  z.coerce.number().int(`${campo}: use un número entero.`).min(min, `${campo}: mínimo ${min}.`).max(max, `${campo}: máximo ${max}.`);

export const RenglonRecetaInput = z.object({
  idMedicamento: Id,
  dosis: z.string().trim().min(1, 'Indique la dosis.').max(100),
  viaAdministracion: z.string().trim().max(50).optional(),
  frecuenciaHoras: entero(1, 168, 'Frecuencia').optional(),
  duracionDias: entero(1, 365, 'Duración').optional(),
  cantidad: entero(1, 10_000, 'Cantidad').optional(),
  indicaciones: z.string().trim().optional(),
});
export type RenglonRecetaInput = z.infer<typeof RenglonRecetaInput>;

export const RenglonReceta = RenglonRecetaInput.extend({
  medicamento: Medicamento.omit({ id: true }),
  viaAdministracion: z.string().nullable(),
  frecuenciaHoras: z.number().nullable(),
  duracionDias: z.number().nullable(),
  cantidad: z.number().nullable(),
  indicaciones: z.string().nullable(),
});
export type RenglonReceta = z.infer<typeof RenglonReceta>;

export const Receta = z.object({
  id: Id,
  idConsulta: Id,
  idMedico: Id,
  fechaEmision: z.string(),
  observaciones: z.string().nullable(),
  diagnostico: z.string().nullable(),
  renglones: z.array(RenglonReceta),
});
export type Receta = z.infer<typeof Receta>;

// ---------- Atención ----------

export const TipoDiagnostico = z.enum(['DEFINITIVO', 'PRESUNTIVO', 'DIFERENCIAL']);
export type TipoDiagnostico = z.infer<typeof TipoDiagnostico>;

/** Rangos iguales a los CHECK del hospital, para que los cuatro motores rechacen lo mismo. */
export const SignosVitales = z.object({
  presionSistolica: entero(40, 300, 'Presión sistólica').optional(),
  presionDiastolica: entero(20, 200, 'Presión diastólica').optional(),
  frecuenciaCardiaca: entero(20, 250, 'Frecuencia cardiaca').optional(),
  frecuenciaRespiratoria: entero(4, 80, 'Frecuencia respiratoria').optional(),
  saturacionOxigeno: entero(0, 100, 'Saturación').optional(),
  temperaturaC: z.coerce.number().min(30, 'Temperatura: mínimo 30 °C.').max(45, 'Temperatura: máximo 45 °C.').optional(),
});
export type SignosVitales = z.infer<typeof SignosVitales>;

export const TratamientoInput = z.object({
  tipo: z.string().trim().min(1, 'Indique el tipo de tratamiento.').max(100),
  descripcion: z.string().trim().min(1, 'Describa el tratamiento.'),
  indicaciones: z.string().trim().optional(),
  fechaInicio: z.string().date().optional(),
  fechaFin: z.string().date().optional(),
  receta: z.object({
    observaciones: z.string().trim().optional(),
    renglones: z.array(RenglonRecetaInput).min(1, 'Agregue al menos un medicamento o quite la receta.'),
  }).optional(),
}).refine((t) => !t.fechaInicio || !t.fechaFin || t.fechaFin >= t.fechaInicio, {
  message: 'La fecha de fin no puede ser anterior a la de inicio.', path: ['fechaFin'],
});
export type TratamientoInput = z.infer<typeof TratamientoInput>;

export const DiagnosticoInput = z.object({
  tipo: TipoDiagnostico,
  enfermedadDetectada: z.string().trim().min(3, 'Escriba el diagnóstico.'),
  observaciones: z.string().trim().optional(),
  tratamientos: z.array(TratamientoInput).default([]),
});
export type DiagnosticoInput = z.infer<typeof DiagnosticoInput>;

export const AbrirConsultaInput = z.object({
  idPaciente: Id,
  idCita: Id.optional(),
  motivo: z.string().trim().optional(),
});
export type AbrirConsultaInput = z.infer<typeof AbrirConsultaInput>;

export const BorradorConsultaInput = z.object({
  motivo: z.string().trim().optional(),
  historiaEnfermedadActual: z.string().trim().optional(),
});
export type BorradorConsultaInput = z.infer<typeof BorradorConsultaInput>;

/** Todo lo que se escribe al cerrar la consulta, en una sola unidad atómica. */
export const CerrarConsultaInput = z.object({
  motivo: z.string().trim().min(3, 'Escriba el motivo de consulta.'),
  historiaEnfermedadActual: z.string().trim().optional(),
  notasEvolucion: z.string().trim().optional(),
  observaciones: z.string().trim().optional(),
  pesoKg: z.coerce.number().positive('Peso inválido.').max(500).optional(),
  tallaCm: z.coerce.number().positive('Talla inválida.').max(300).optional(),
  signos: SignosVitales.default({}),
  diagnosticos: z.array(DiagnosticoInput).min(1, 'Registre al menos un diagnóstico.'),
  /** El médico vio la alerta de alergia y decide recetar de todos modos. */
  confirmarAlergias: z.boolean().default(false),
});
export type CerrarConsultaInput = z.infer<typeof CerrarConsultaInput>;

export const Tratamiento = z.object({
  id: Id,
  tipo: z.string(),
  descripcion: z.string().nullable(),
  indicaciones: z.string().nullable(),
  fechaInicio: z.string().nullable(),
  fechaFin: z.string().nullable(),
  receta: Receta.omit({ diagnostico: true }).nullable(),
});
export type Tratamiento = z.infer<typeof Tratamiento>;

export const Diagnostico = z.object({
  id: Id,
  tipo: z.string(),
  enfermedadDetectada: z.string().nullable(),
  observaciones: z.string().nullable(),
  tratamientos: z.array(Tratamiento),
});
export type Diagnostico = z.infer<typeof Diagnostico>;

export const ConsultaDetalle = z.object({
  id: Id,
  idPaciente: Id,
  idCita: Id.nullable(),
  idMedico: Id,
  fecha: z.string(),
  hora: z.string(),
  motivo: z.string().nullable(),
  historiaEnfermedadActual: z.string().nullable(),
  notasEvolucion: z.string().nullable(),
  observaciones: z.string().nullable(),
  pesoKg: z.number().nullable(),
  tallaCm: z.number().nullable(),
  signos: z.object({
    presionSistolica: z.number().nullable(), presionDiastolica: z.number().nullable(),
    frecuenciaCardiaca: z.number().nullable(), frecuenciaRespiratoria: z.number().nullable(),
    saturacionOxigeno: z.number().nullable(), temperaturaC: z.number().nullable(),
  }).nullable(),
  diagnosticos: z.array(Diagnostico),
  cerrada: z.boolean(),
});
export type ConsultaDetalle = z.infer<typeof ConsultaDetalle>;

/** Respuesta 409 de cerrar consulta cuando la receta choca con una alergia registrada. */
export interface AlertaAlergia { idMedicamento: string; medicamento: string; alergia: string; severidad: string | null }
