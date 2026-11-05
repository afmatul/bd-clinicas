import { z } from 'zod';
import { Id } from './pacientes.js';

export const Especialidad = z.object({ id: Id, nombre: z.string(), idDepartamento: Id.nullable() });
export type Especialidad = z.infer<typeof Especialidad>;

export const Departamento = z.object({
  id: Id,
  nombre: z.string(),
  ubicacion: z.string().nullable(),
  extension: z.string().nullable(),
  especialidades: z.array(z.object({ id: Id, nombre: z.string() })),
});
export type Departamento = z.infer<typeof Departamento>;

/** Médico (hospital), pediatra (pediátrico), químico biólogo (laboratorio) u odontólogo. */
export const Profesional = z.object({
  id: Id,
  nombres: z.string(),
  apellidos: z.string(),
  numeroColegiado: z.string(),
  especialidades: z.array(z.object({ id: Id, nombre: z.string() })),
});
export type Profesional = z.infer<typeof Profesional>;

export const DirectorioQuery = z.object({
  q: z.string().trim().optional(),
  especialidad: Id.optional(),
});
export type DirectorioQuery = z.infer<typeof DirectorioQuery>;

export const RegistrarProfesionalInput = z.object({
  nombres: z.string().trim().min(1, 'Escriba los nombres.').max(150),
  apellidos: z.string().trim().min(1, 'Escriba los apellidos.').max(150),
  numeroColegiado: z.string().trim().min(3, 'Escriba el número de colegiado.').max(30),
  /** Solo en el hospital: ids de especialidades; en las demás, nombres libres. */
  especialidades: z.array(z.string().trim().min(1)).default([]),
});
export type RegistrarProfesionalInput = z.infer<typeof RegistrarProfesionalInput>;
