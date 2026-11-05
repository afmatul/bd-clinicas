import { z } from 'zod';
import { Id } from './pacientes.js';

export const Severidad = z.enum(['LEVE', 'MODERADA', 'SEVERA']);
export type Severidad = z.infer<typeof Severidad>;

/** Alergia nueva. Si es a un medicamento del catálogo, idMedicamento permite que prescripcion la bloquee al recetar. */
export const RegistrarAlergiaInput = z.object({
  tipo: z.string().trim().min(2, 'Indique a qué es alérgico el paciente.').max(100),
  descripcion: z.string().trim().max(2000).optional(),
  severidad: Severidad,
  idMedicamento: Id.optional(),
});
export type RegistrarAlergiaInput = z.infer<typeof RegistrarAlergiaInput>;

export const RegistrarAntecedenteInput = z.object({
  tipo: z.string().trim().min(2, 'Indique el antecedente.').max(100),
  descripcion: z.string().trim().max(2000).optional(),
});
export type RegistrarAntecedenteInput = z.infer<typeof RegistrarAntecedenteInput>;
